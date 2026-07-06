// features/reposition.js
// Positioning panel: lat/lon/height/heading/pitch/roll inputs, place-at-camera,
// click-on-map, save (localStorage), reset, and fly-to-model.
//
// Adapted from the CS4D reposition.js for this single-model, backend-free
// prototype: positions persist to localStorage instead of the ion description.

import { state } from "../core/state.js";
import { $ } from "../core/utils.js";
import { t, onLangChange } from "../core/i18n.js";

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

  // Rebase the model from the East-North-Up frame at its ORIGINAL location to the
  // ENU frame at the TARGET. Because an ENU frame's rotation depends only on
  // lat/lon (not height), this preserves the model's native orientation — moving
  // height becomes a pure vertical translation instead of a rotation. heading/
  // pitch/roll are then applied as a delta on top of the native orientation.
  const target = Cesium.Transforms.headingPitchRollToFixedFrame(position, hpr);
  const source = Cesium.Transforms.eastNorthUpToFixedFrame(state.originalCenter);
  const inverseSource = Cesium.Matrix4.inverse(source, new Cesium.Matrix4());

  state.tileset.modelMatrix = Cesium.Matrix4.multiply(target, inverseSource, new Cesium.Matrix4());
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
// Match ion exactly: do NOT modify the asset's native transform on load. ion's
// own code snippet adds the tileset with no modelMatrix change, so whatever the
// asset ships with is already correct. Repositioning is opt-in via this panel or
// a previously saved position.
//
// (An earlier "auto-level" heuristic proved unreliable — classifying georeferenced
// vs not by bounding-sphere distance mis-fired when the sphere wasn't settled yet,
// tilting models that were already correct.)
export function onModelLoaded() {
  const saved = localStorage.getItem(`model_position_${state.assetId}`);
  if (saved) {
    try {
      const pos = JSON.parse(saved);
      fillInputs(pos);
      applyPosition();
      return;
    } catch (_) {}
  }
  fillInputs(currentPosition());
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

  // Save to localStorage
  $("save-position-btn").addEventListener("click", () => {
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
    msg.textContent = t("pos.saved");
    msg.classList.remove("hidden");
    setTimeout(() => msg.classList.add("hidden"), 2500);
  });

  // Reset: clear any saved position and restore the asset's native transform.
  $("reset-position-btn").addEventListener("click", () => {
    if (!state.tileset) return;
    localStorage.removeItem(`model_position_${state.assetId}`);
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
