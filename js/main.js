// main.js — bootstrap: wire every feature module once the DOM is ready.

import { state } from "./core/state.js";
import { $ } from "./core/utils.js";
import { initI18n, setLang, getLang, onLangChange } from "./core/i18n.js";
import { initLoader } from "./features/loader.js";
import { initToolbar, setMode } from "./features/modes.js";
import { initInspect } from "./features/inspect.js";
import { initFilter } from "./features/filter.js";
import { initExplode } from "./features/explode.js";
import { initReposition } from "./features/reposition.js";
import { initPresentation, refreshPresentationLang } from "./features/presentation.js";
import { ensureViewer } from "./features/viewer.js";

function langLabel(lang) { return lang === "en" ? "日本語" : "English"; }

function boot() {
  initI18n();          // apply saved/default language to static DOM

  // Kick off the Cesium globe immediately so it's ready when the user loads an asset.
  ensureViewer();

  initLoader();
  initToolbar();
  initInspect();
  initFilter();
  initExplode();
  initReposition();
  initPresentation();

  // Language toggle (top-right)
  $("langBtn").textContent = langLabel(getLang());
  $("langBtn").addEventListener("click", () => setLang(getLang() === "en" ? "ja" : "en"));

  onLangChange((lang) => {
    $("langBtn").textContent = langLabel(lang);
    // Refresh the measurement hint (only when idle, so an in-progress
    // measurement isn't wiped) and the open slide deck.
    if ($("toolbar").classList.contains("show") &&
        state.mode !== "inspect" &&
        state.measurePoints.length === 0) {
      setMode(state.mode);
    }
    refreshPresentationLang(lang);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
