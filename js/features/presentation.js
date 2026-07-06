// features/presentation.js
// Launch the slide deck (slides.html) in a full-screen overlay iframe, with the
// current UI language passed through via ?lang=.

import { $ } from "../core/utils.js";
import { getLang } from "../core/i18n.js";

function frameSrc(lang) { return `slides.html?lang=${lang}`; }

function close() {
  const overlay = $("presentation");
  overlay.classList.add("hidden");
  $("presentFrame").src = "about:blank"; // stop the deck when closed
}

function open() {
  $("presentFrame").src = frameSrc(getLang());
  $("presentation").classList.remove("hidden");
}

export function initPresentation() {
  $("presentBtn").addEventListener("click", open);
  $("presentClose").addEventListener("click", close);

  // Click the dark backdrop (but not the iframe) to dismiss.
  $("presentation").addEventListener("click", (e) => {
    if (e.target.id === "presentation") close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("presentation").classList.contains("hidden")) close();
  });
}

// Re-load the open deck in the new language when the user toggles it.
export function refreshPresentationLang(lang) {
  const overlay = $("presentation");
  if (overlay && !overlay.classList.contains("hidden")) {
    $("presentFrame").src = frameSrc(lang);
  }
}
