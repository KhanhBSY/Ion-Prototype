// features/loader.js
// Connect to Cesium ion and load a 3D Tiles asset, then reveal the UI.

import { state } from "../core/state.js";
import { $, setStatus } from "../core/utils.js";
import { t } from "../core/i18n.js";
import { ensureViewer } from "./viewer.js";
import { setupExplodeShader } from "./explode.js";
import { setMode } from "./modes.js";
import { onModelLoaded } from "./reposition.js";
import { resetFilter } from "./filter.js";

async function loadAsset() {
  const token = $("token").value.trim();
  const assetId = parseInt($("assetId").value.trim(), 10);
  if (!token) return setStatus(t("status.needToken"), "status-err");
  if (!assetId) return setStatus(t("status.needAsset"), "status-err");

  $("loadBtn").disabled = true;
  setStatus(t("status.connecting"), "status-work");

  try {
    Cesium.Ion.defaultAccessToken = token;
    localStorage.setItem("cesium_token", token);

    ensureViewer();

    // Remove a previously loaded tileset if reloading.
    if (state.tileset) { state.viewer.scene.primitives.remove(state.tileset); state.tileset = null; }

    setStatus(t("status.loading"), "status-work");
    const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(assetId);
    state.viewer.scene.primitives.add(tileset);

    state.tileset = tileset;
    state.assetId = assetId;
    state.originalCenter = Cesium.Cartesian3.clone(tileset.boundingSphere.center);
    state.modelRadius = tileset.boundingSphere.radius || 1;

    resetFilter(); // clear any prior model's filter state and rebind to this tileset
    setupExplodeShader();
    await onModelLoaded(); // restore saved / drop non-georef at Tokyo before zooming

    await state.viewer.zoomTo(tileset, new Cesium.HeadingPitchRange(0.4, -0.5, state.modelRadius * 2.2));

    // Reveal UI
    $("toolbar").classList.add("show");
    $("explode").classList.add("show");
    $("connect").style.display = "none";
    setMode("inspect");
    setStatus("", "");
  } catch (err) {
    console.error(err);
    setStatus(t("status.loadFailed") + (err && err.message ? err.message : err), "status-err");
    $("loadBtn").disabled = false;
  }
}

export function initLoader() {
  // Prefill last-used token for convenience.
  const saved = localStorage.getItem("cesium_token");
  if (saved) $("token").value = saved;

  $("loadBtn").addEventListener("click", loadAsset);
  ["token", "assetId"].forEach((id) =>
    $(id).addEventListener("keydown", (e) => { if (e.key === "Enter") loadAsset(); })
  );
}
