// features/reposition.js
// Positioning panel: lat/lon/height/heading/pitch/roll inputs, place-at-camera,
// click-on-map, save, reset, and fly-to-model.
//
// Location strategy (mirrors the CS4D approach, adapted backend-free):
//   • Every asset first loads at its ORIGINAL/native transform — georeferenced
//     assets already sit correctly on the globe, so we never touch them.
//   • A previously saved position (ion asset description, or localStorage cache)
//     always wins and is re-applied on load.
//   • An asset with NO geo-reference (its native centre falls near the Earth's
//     core) is dropped at Tokyo the first time and that position is written back
//     to the ion asset description, so it re-loads in the same place next time.

import { state } from "../core/state.js";
import { $ } from "../core/utils.js";
import { t, onLangChange } from "../core/i18n.js";

// Default drop point for non-georeferenced assets (Tokyo Station).
const TOKYO = { lat: 35.681236, lon: 139.767125, height: 0, heading: 0, pitch: 0, roll: 0 };

// ── Cesium ion asset-description persistence (backend-free) ───────
// We talk to the ion REST API directly from the browser using the same token
// used to load the tileset. A tiny marker line embeds the position JSON inside
// the human-readable description, so it round-trips without a separate backend.
const ION_API = "https://api.cesium.com/v1";
const POS_MARKER = "__eb_pos__:";

function parsePosFromDescription(description) {
  const m = (description ?? "").match(/__eb_pos__:(\{[^\n]+\})/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch (_) { return null; }
}

function embedPosInDescription(description, pos) {
  const stripped = (description ?? "").replace(/\n?__eb_pos__:[^\n]*/g, "");
  return `${stripped}\n${POS_MARKER}${JSON.stringify(pos)}`;
}

async function fetchIonAsset(assetId) {
  const res = await fetch(`${ION_API}/assets/${assetId}`, {
    headers: { Authorization: `Bearer ${Cesium.Ion.defaultAccessToken}` },
  });
  if (!res.ok) throw new Error(`ion GET ${res.status}`);
  return res.json();
}

// Read a saved position from the ion asset description (null if none / on error).
export async function loadIonPosition(assetId) {
  try {
    const asset = await fetchIonAsset(assetId);
    return parsePosFromDescription(asset.description);
  } catch (_) { return null; }
}

// Persist a position into the ion asset description (throws on failure).
async function saveIonPosition(assetId, pos) {
  const asset = await fetchIonAsset(assetId);
  const res = await fetch(`${ION_API}/assets/${assetId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Cesium.Ion.defaultAccessToken}`,
    },
    body: JSON.stringify({
      name: asset.name,
      description: embedPosInDescription(asset.description, pos),
    }),
  });
  if (!res.ok) throw new Error(`ion PATCH ${res.status}`);
}

// Remove any saved position from the ion asset description (throws on failure).
async function clearIonPosition(assetId) {
  const asset = await fetchIonAsset(assetId);
  const stripped = (asset.description ?? "").replace(/\n?__eb_pos__:[^\n]*/g, "");
  const res = await fetch(`${ION_API}/assets/${assetId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Cesium.Ion.defaultAccessToken}`,
    },
    body: JSON.stringify({ name: asset.name, description: stripped }),
  });
  if (!res.ok) throw new Error(`ion PATCH ${res.status}`);
}

// Is the asset georeferenced? A non-georeferenced (local-CAD) tileset has its
// native centre near the ECEF origin, which maps to a cartographic height close
// to -6,378 km (the Earth's radius). Real-world assets sit within a sane band.
function isGeoreferenced(tileset) {
  try {
    const carto = Cesium.Cartographic.fromCartesian(tileset.boundingSphere.center);
    if (!carto) return false;
    return carto.height > -50000 && carto.height < 200000;
  } catch (_) { return false; }
}

// ── Core: apply lat/lon/height/heading/pitch/roll to the tileset matrix ──
export function applyPosition() {
  if (!state.tileset || !state.originalCenter) return;

  const lat     = parseFloat($("pos-lat").value)     || 0;
  const lon     = parseFloat($("pos-lon").value)     || 0;
  const height  = parseFloat($("pos-height").value)  || 0;
  const heading = parseFloat($("pos-heading").value) || 0;
  const pitch   = parseFloat($("pos-pitch").value)   || 0;
  const roll    = parseFloat($("pos-roll").value)    || 0;

  const position = Cesium.Cartesian3.fromDegrees(lon, lat, height);
  const hpr = new Cesium.HeadingPitchRoll(
    Cesium.Math.toRadians(heading),
    Cesium.Math.toRadians(pitch),
    Cesium.Math.toRadians(roll)
  );

  // Build the East-North-Up + HPR frame at the target, then translate the model
  // so its native centre lands at that frame's origin. This drops the asset onto
  // the globe upright — exactly what a non-georeferenced model needs.
  const fixedFrame = Cesium.Transforms.headingPitchRollToFixedFrame(position, hpr);
  state.tileset.modelMatrix = Cesium.Matrix4.multiply(
    fixedFrame,
    Cesium.Matrix4.fromTranslation(
      Cesium.Cartesian3.negate(state.originalCenter, new Cesium.Cartesian3())
    ),
    new Cesium.Matrix4()
  );
}

// ── Fill inputs from a position object ────────────────────────────
function fillInputs(p) {
  const f = (v, d) => (typeof v === "number" ? v.toFixed(d) : String(v ?? ""));
  $("pos-lat").value     = f(p.lat, 6);
  $("pos-lon").value     = f(p.lon, 6);
  $("pos-height").value  = f(p.height, 1);
  $("pos-heading").value = f(p.heading, 2);
  $("pos-pitch").value   = f(p.pitch, 2);
  $("pos-roll").value    = f(p.roll, 2);
}

// Read the tileset's current world center → a position object (so the panel
// is never blank for a loaded model).
function currentPosition() {
  try {
    const world = Cesium.Matrix4.multiplyByPoint(
      state.tileset.modelMatrix, state.originalCenter, new Cesium.Cartesian3()
    );
    const c = Cesium.Cartographic.fromCartesian(world);
    return {
      lat: Cesium.Math.toDegrees(c.latitude),
      lon: Cesium.Math.toDegrees(c.longitude),
      height: c.height, heading: 0, pitch: 0, roll: 0,
    };
  } catch (_) { return { lat: 0, lon: 0, height: 0, heading: 0, pitch: 0, roll: 0 }; }
}

// ── Called once after a model loads ──────────────────────────────
// Order of precedence:
//   1. Saved position (localStorage cache, then ion asset description) → apply.
//   2. Georeferenced asset with no saved position → keep native transform.
//   3. Non-georeferenced asset, first ever load → drop at Tokyo and persist.
export async function onModelLoaded() {
  // 1a. localStorage cache (fast, this-browser).
  let pos = null;
  const cached = localStorage.getItem(`model_position_${state.assetId}`);
  if (cached) { try { pos = JSON.parse(cached); } catch (_) {} }

  // 1b. ion asset description (cross-device) if nothing cached locally.
  if (!pos) {
    pos = await loadIonPosition(state.assetId);
    if (pos) localStorage.setItem(`model_position_${state.assetId}`, JSON.stringify(pos));
  }

  if (pos) {
    fillInputs(pos);
    applyPosition();
    return;
  }

  // 2. Georeferenced → leave the native transform untouched.
  if (isGeoreferenced(state.tileset)) {
    fillInputs(currentPosition());
    return;
  }

  // 3. Non-georeferenced, first load → drop at Tokyo and persist for next time.
  const drop = { ...TOKYO };
  fillInputs(drop);
  applyPosition();
  localStorage.setItem(`model_position_${state.assetId}`, JSON.stringify(drop));
  saveIonPosition(state.assetId, drop).catch((err) =>
    console.warn("ion position auto-save failed:", err)
  );
}

// ── Click-on-map ──────────────────────────────────────────────────
function startClickToPlace() {
  state.clickToPlaceActive = true;
  const btn = $("click-on-map-btn");
  btn.textContent = t("pos.cancel");
  btn.classList.add("armed");
  $("click-map-hint").classList.remove("hidden");

  state.clickHandler = new Cesium.ScreenSpaceEventHandler(state.viewer.scene.canvas);
  state.clickHandler.setInputAction((click) => {
    const scene = state.viewer.scene;
    const cart = scene.pickPosition(click.position) ||
                 scene.globe.pick(state.viewer.camera.getPickRay(click.position), scene);
    if (!cart) return;
    const c = Cesium.Cartographic.fromCartesian(cart);
    $("pos-lat").value    = Cesium.Math.toDegrees(c.latitude).toFixed(6);
    $("pos-lon").value    = Cesium.Math.toDegrees(c.longitude).toFixed(6);
    $("pos-height").value = Math.max(0, c.height).toFixed(1);
    applyPosition();
    cancelClickToPlace();
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

export function cancelClickToPlace() {
  state.clickToPlaceActive = false;
  const btn = $("click-on-map-btn");
  if (btn) { btn.textContent = t("pos.clickMap"); btn.classList.remove("armed"); }
  $("click-map-hint")?.classList.add("hidden");
  if (state.clickHandler) { state.clickHandler.destroy(); state.clickHandler = null; }
}

// ── Init: wire all panel controls ─────────────────────────────────
export function initReposition() {
  $("positionBtn").addEventListener("click", () => {
    $("position").classList.toggle("show");
  });
  $("positionClose").addEventListener("click", () => {
    $("position").classList.remove("show");
    cancelClickToPlace();
  });

  // Real-time update on every input change
  ["pos-lat", "pos-lon", "pos-height", "pos-heading", "pos-pitch", "pos-roll"]
    .forEach((id) => $(id).addEventListener("input", applyPosition));

  // Place at camera (drop model at the point under screen center)
  $("place-at-camera-btn").addEventListener("click", () => {
    if (!state.tileset) return;
    const scene = state.viewer.scene;
    const ray = state.viewer.camera.getPickRay(new Cesium.Cartesian2(
      state.viewer.canvas.clientWidth / 2, state.viewer.canvas.clientHeight / 2
    ));
    const cart = scene.globe.pick(ray, scene);
    if (!cart) { alert(t("pos.aimGround")); return; }
    const c = Cesium.Cartographic.fromCartesian(cart);
    $("pos-lat").value    = Cesium.Math.toDegrees(c.latitude).toFixed(6);
    $("pos-lon").value    = Cesium.Math.toDegrees(c.longitude).toFixed(6);
    $("pos-height").value = "0.0";
    applyPosition();
  });

  // Click on map toggle
  $("click-on-map-btn").addEventListener("click", () => {
    if (state.clickToPlaceActive) cancelClickToPlace();
    else startClickToPlace();
  });

  // Save: localStorage (immediate) + ion asset description (cross-device).
  $("save-position-btn").addEventListener("click", async () => {
    if (!state.tileset) return;
    const pos = {
      lat:     parseFloat($("pos-lat").value)     || 0,
      lon:     parseFloat($("pos-lon").value)     || 0,
      height:  parseFloat($("pos-height").value)  || 0,
      heading: parseFloat($("pos-heading").value) || 0,
      pitch:   parseFloat($("pos-pitch").value)   || 0,
      roll:    parseFloat($("pos-roll").value)    || 0,
    };
    localStorage.setItem(`model_position_${state.assetId}`, JSON.stringify(pos));

    const msg = $("save-position-msg");
    msg.textContent = t("pos.saving");
    msg.classList.remove("hidden");
    try {
      await saveIonPosition(state.assetId, pos);
      msg.textContent = t("pos.saved");
    } catch (err) {
      msg.textContent = t("pos.savedLocalOnly");
      console.warn("ion position save failed:", err);
    }
    setTimeout(() => msg.classList.add("hidden"), 3000);
  });

  // Reset: forget saved position (localStorage + ion) and restore native transform.
  $("reset-position-btn").addEventListener("click", () => {
    if (!state.tileset) return;
    localStorage.removeItem(`model_position_${state.assetId}`);
    clearIonPosition(state.assetId).catch((err) =>
      console.warn("ion position clear failed:", err)
    );
    state.tileset.modelMatrix = Cesium.Matrix4.IDENTITY.clone();
    fillInputs(currentPosition());
  });

  // Fly to model
  $("fly-to-model-btn").addEventListener("click", () => {
    if (state.tileset) state.viewer.flyTo(state.tileset, {
      duration: 1.5,
      offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-35), 0),
    });
  });

  // Initial dynamic label + keep it localized on language change.
  $("click-on-map-btn").textContent = t("pos.clickMap");
  onLangChange(() => {
    if (!state.clickToPlaceActive) $("click-on-map-btn").textContent = t("pos.clickMap");
  });
}
