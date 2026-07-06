// features/measure.js
// Distance & area measurement with edge snapping.

import { state } from "../core/state.js";
import { $, fmt } from "../core/utils.js";
import { t } from "../core/i18n.js";

// ── Click handling ───────────────────────────────────────
export function handleMeasureClick(click) {
  const scene = state.viewer.scene;
  if (!scene.pickPositionSupported) {
    $("readout").innerHTML = `<span style='color:var(--bad)'>${t("readout.noPick")}</span>`;
    return;
  }
  const pos = scene.pickPosition(click.position);
  if (!Cesium.defined(pos)) return; // clicked empty space

  state.measurePoints.push(pos);
  drawVertex(pos);
  if (state.mode === "distance") updateDistance();
  else if (state.mode === "area") updateArea();
}

// ── Distance ──────────────────────────────────────────────────────
function updateDistance() {
  redrawPolyline(false);
  let total = 0;
  for (let i = 1; i < state.measurePoints.length; i++) {
    total += Cesium.Cartesian3.distance(state.measurePoints[i - 1], state.measurePoints[i]);
  }
  $("readout").innerHTML = `${t("readout.distanceLabel")}: <b>${fmt(total)} m</b>` +
    (state.measurePoints.length > 2 ? ` &nbsp;(${state.measurePoints.length - 1} ${t("readout.segments")})` : "");
}

// ── Area ───────────────────────────────────────────────
function updateArea() {
  if (state.measurePoints.length < 2) {
    $("readout").innerHTML = t("readout.areaHint");
    return;
  }
  redrawPolyline(true);
  if (state.measurePoints.length >= 3) {
    drawPolygon();
    const a = polygonArea3D(state.measurePoints);
    $("readout").innerHTML = `${t("readout.areaLabel")}: <b>${fmt(a)} m&sup2;</b> &nbsp;(${state.measurePoints.length} ${t("readout.points")})`;
  } else {
    $("readout").innerHTML = `${t("readout.areaLabel")}: ${t("readout.addPoint")} (${state.measurePoints.length}/3)`;
  }
}

// Sum of fan-triangle areas in 3D — planar-ish surface area of the clicked ring.
function polygonArea3D(pts) {
  let area = 0;
  const v0 = pts[0];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = Cesium.Cartesian3.subtract(pts[i], v0, new Cesium.Cartesian3());
    const b = Cesium.Cartesian3.subtract(pts[i + 1], v0, new Cesium.Cartesian3());
    const cross = Cesium.Cartesian3.cross(a, b, new Cesium.Cartesian3());
    area += Cesium.Cartesian3.magnitude(cross) * 0.5;
  }
  return area;
}

// ── Drawing helpers ───────────────────────────────────────────────
function drawVertex(pos) {
  state.measureEntities.push(state.viewer.entities.add({
    position: pos,
    point: {
      pixelSize: 9, color: Cesium.Color.fromCssColorString("#4cc2ff"),
      outlineColor: Cesium.Color.WHITE, outlineWidth: 1,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  }));
}

function redrawPolyline(closed) {
  if (state.polyEntity) { state.viewer.entities.remove(state.polyEntity); state.polyEntity = null; }
  if (state.measurePoints.length < 2) return;
  const positions = closed && state.measurePoints.length >= 3
    ? state.measurePoints.concat([state.measurePoints[0]]) : state.measurePoints;
  state.polyEntity = state.viewer.entities.add({
    polyline: {
      positions, width: 2, material: Cesium.Color.fromCssColorString("#4cc2ff"),
      clampToGround: false,
      depthFailMaterial: Cesium.Color.fromCssColorString("#4cc2ff").withAlpha(0.4),
    },
  });
}

function drawPolygon() {
  if (state.polygonEntity) { state.viewer.entities.remove(state.polygonEntity); state.polygonEntity = null; }
  state.polygonEntity = state.viewer.entities.add({
    polygon: {
      hierarchy: state.measurePoints, perPositionHeight: true,
      material: Cesium.Color.fromCssColorString("#4cc2ff").withAlpha(0.18),
      outline: false,
    },
  });
}

export function clearMeasurement() {
  state.measurePoints = [];
  state.measureEntities.forEach((e) => state.viewer && state.viewer.entities.remove(e));
  state.measureEntities.length = 0;
  if (state.polyEntity) { state.viewer.entities.remove(state.polyEntity); state.polyEntity = null; }
  if (state.polygonEntity) { state.viewer.entities.remove(state.polygonEntity); state.polygonEntity = null; }
  if (state.mode === "distance") $("readout").innerHTML = t("readout.distanceHint");
  if (state.mode === "area") $("readout").innerHTML = t("readout.areaHint");
}
