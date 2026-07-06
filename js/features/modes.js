// features/modes.js
// Toolbar wiring + interaction-mode switching (inspect / distance / area),
// plus the snap toggle, clear and recenter buttons.

import { state } from "../core/state.js";
import { $ } from "../core/utils.js";
import { t } from "../core/i18n.js";
import { setTerrainEnabled } from "./viewer.js";
import { clearMeasurement } from "./measure.js";
import { clearHighlight } from "./inspect.js";

export function setMode(m) {
  state.mode = m;
  document.querySelectorAll(".tool[data-mode]").forEach((b) =>
    b.classList.toggle("active", b.dataset.mode === m)
  );
  clearMeasurement();
  if (m !== "inspect") { $("meta").classList.remove("show"); clearHighlight(); }

  const r = $("readout");
  if (m === "distance") { r.classList.add("show"); r.innerHTML = t("readout.distanceHint"); }
  else if (m === "area") { r.classList.add("show"); r.innerHTML = t("readout.areaHint"); }
  else { r.classList.remove("show"); }
}

export function initToolbar() {
  document.querySelectorAll(".tool[data-mode]").forEach((b) =>
    b.addEventListener("click", () => setMode(b.dataset.mode))
  );

  $("clearBtn").addEventListener("click", clearMeasurement);
  $("homeBtn").addEventListener("click", () => { if (state.tileset) state.viewer.zoomTo(state.tileset); });

  $("terrainBtn").addEventListener("click", () => {
    const on = !state.terrainEnabled;
    setTerrainEnabled(on);
    $("terrainBtn").classList.toggle("active", on);
  });
}
