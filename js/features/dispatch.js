// features/dispatch.js
// Routes the global left-click to the active feature handler based on state.mode.

import { state } from "../core/state.js";
import { handleMeasureClick } from "./measure.js";
import { inspectFeature } from "./inspect.js";

export function onLeftClick(click) {
  if (!state.viewer) return;
  if (state.mode === "inspect") inspectFeature(click);
  else handleMeasureClick(click);
}
