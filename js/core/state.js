// core/state.js
// Single shared, mutable state object passed between feature modules.

export const state = {
  // viewer / scene
  viewer: null,
  handler: null,           // global ScreenSpaceEventHandler (click dispatch)

  // loaded asset
  tileset: null,
  assetId: null,
  originalCenter: null,    // Cartesian3 — model center at load (identity matrix)
  modelRadius: 1,          // bounding-sphere radius in metres

  // interaction mode: "inspect" | "distance" | "area"
  mode: "inspect",

  // measurement
  measurePoints: [],       // Cartesian3[]
  measureEntities: [],     // entities drawn for the current measurement
  polyEntity: null,
  polygonEntity: null,

  // inspect
  highlighted: null,       // { feature, color }

  // explode
  explodeShader: null,

  // terrain (Cesium World Terrain; off by default)
  terrainEnabled: false,

  // reposition
  clickToPlaceActive: false,
  clickHandler: null,
};
