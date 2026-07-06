// features/inspect.js
// Click a feature → highlight it and show its per-feature metadata.

import { state } from "../core/state.js";
import { $, escapeHtml } from "../core/utils.js";
import { t } from "../core/i18n.js";

export function inspectFeature(click) {
  const picked = state.viewer.scene.pick(click.position);
  clearHighlight();

  if (!Cesium.defined(picked) || !(picked instanceof Cesium.Cesium3DTileFeature)) {
    $("meta").classList.remove("show");
    return;
  }

  // highlight
  state.highlighted = { feature: picked, color: Cesium.Color.clone(picked.color) };
  picked.color = Cesium.Color.YELLOW.withAlpha(0.85);

  const ids = picked.getPropertyIds();
  const body = $("metaBody");
  if (!ids || ids.length === 0) {
    body.innerHTML = `<div class="empty">${t("meta.empty")}</div>`;
  } else {
    let rows = "";
    ids.sort().forEach((id) => {
      let val = picked.getProperty(id);
      if (val && typeof val === "object") val = JSON.stringify(val);
      rows += `<tr><td class="k">${escapeHtml(id)}</td><td class="v">${escapeHtml(String(val))}</td></tr>`;
    });
    body.innerHTML = `<table>${rows}</table>`;
  }
  $("meta").classList.add("show");
}

export function clearHighlight() {
  if (state.highlighted) {
    try { state.highlighted.feature.color = state.highlighted.color; } catch (e) {}
    state.highlighted = null;
  }
}

export function initInspect() {
  $("metaClose").addEventListener("click", () => {
    $("meta").classList.remove("show");
    clearHighlight();
  });
}
