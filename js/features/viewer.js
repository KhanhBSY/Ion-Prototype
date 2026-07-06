// features/viewer.js
// Creates the Cesium Viewer with the GLOBE + terrain + imagery ENABLED, so
// repositioned models sit on the Earth instead of floating in empty space.

import { state } from "../core/state.js";
import { onLeftClick } from "./dispatch.js";

export function ensureViewer() {
  if (state.viewer) return state.viewer;

  const viewer = new Cesium.Viewer("cesiumContainer", {
    animation: false, timeline: false, geocoder: false, homeButton: false,
    sceneModePicker: false, baseLayerPicker: false, navigationHelpButton: false,
    fullscreenButton: false, infoBox: false, selectionIndicator: false,
    // Default ion world imagery loads (uses the access token set by the loader).
  });

  // Globe ON — this is what was missing before (model floated in the void).
  viewer.scene.globe.show = true;
  viewer.scene.globe.depthTestAgainstTerrain = true;
  viewer.scene.pickTranslucentDepth = true;

  // Terrain OFF by default (flat ellipsoid). Toggle on via the Terrain button.
  state.terrainEnabled = false;

  state.viewer = viewer;

  // Single global click handler that dispatches by current mode.
  state.handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  state.handler.setInputAction(onLeftClick, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  return viewer;
}

// Toggle Cesium World Terrain on/off (off = flat ellipsoid surface).
export function setTerrainEnabled(enabled) {
  if (!state.viewer) return;
  state.terrainEnabled = enabled;
  if (enabled) {
    try { state.viewer.scene.setTerrain(Cesium.Terrain.fromWorldTerrain()); } catch (_) {}
  } else {
    state.viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
  }
}
