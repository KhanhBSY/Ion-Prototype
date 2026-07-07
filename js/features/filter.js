// features/filter.js
// Filter / isolate BIM features by matching a keyword against a chosen set of
// per-feature properties — the same properties shown in the Feature metadata
// panel. Matching features keep their natural look; everything else is dimmed
// to translucent grey (an "isolate" filter).
//
// Matching is a plain, case-insensitive "contains" test done in JS (so numbers
// and strings both work, with no styling-expression escaping). It is applied to
// every feature through the tileset's per-frame `tileVisible` event, so tiles
// that stream in later are filtered too. A version counter makes each feature
// re-evaluate exactly once per change instead of every frame.

import { state } from "../core/state.js";
import { $, escapeHtml } from "../core/utils.js";
import { t, onLangChange } from "../core/i18n.js";

const knownProps = new Set();    // every property id ever seen in metadata
const selectedProps = new Set(); // subset the user wants to search
let keyword = "";
let active = false;
let version = 0;                  // bumped on every change; drives re-evaluation
let attachedTileset = null;      // tileset our tileVisible handler is bound to
let debounceTimer = null;

let MATCH_COLOR = null;          // lazy: Cesium global is ready at call time
let DIM_COLOR = null;
const processed = new WeakMap(); // feature -> { v } "already coloured" marker

function ensureColors() {
  if (MATCH_COLOR) return;
  MATCH_COLOR = Cesium.Color.WHITE; // white = no tint = the feature's real look
  DIM_COLOR = Cesium.Color.fromCssColorString("#39434f").withAlpha(0.12);
}

// ---- matching -------------------------------------------------------------

function featureMatches(f) {
  const kw = keyword.toLowerCase();
  for (const p of selectedProps) {
    let v;
    try { v = f.getProperty(p); } catch (_) { v = undefined; }
    if (v === undefined || v === null) continue;
    if (typeof v === "object") { try { v = JSON.stringify(v); } catch (_) { v = String(v); } }
    if (String(v).toLowerCase().includes(kw)) return true;
  }
  return false;
}

function processFeature(f) {
  if (!f) return;
  // Never fight the inspect click-highlight; leave that feature untouched.
  if (state.highlighted && state.highlighted.feature === f) return;
  const rec = processed.get(f);
  if (rec && rec.v === version) return; // already coloured for this change
  ensureColors();
  const target = !active ? MATCH_COLOR              // inactive -> natural
               : featureMatches(f) ? MATCH_COLOR    // match     -> natural
               : DIM_COLOR;                          // non-match -> dimmed
  processed.set(f, { v: version });
  try { f.color = target; } catch (_) {}
}

function processContent(content) {
  if (!content) return;
  const n = content.featuresLength || 0;
  for (let i = 0; i < n; i++) processFeature(content.getFeature(i));
  const inner = content.innerContents; // composite tiles
  if (inner) for (let i = 0; i < inner.length; i++) processContent(inner[i]);
}

function onTileVisible(tile) {
  processContent(tile.content);
}

function ensureHandler() {
  const ts = state.tileset;
  if (!ts || attachedTileset === ts) return;
  ts.tileVisible.addEventListener(onTileVisible);
  attachedTileset = ts;
}

// ---- property preloading --------------------------------------------------

// Collect property names straight from features as tiles render, so the filter
// list is ready without the user clicking anything. Property ids are uniform
// per content (shared batch table / schema), so reading the first feature of
// each content is enough; a WeakSet keeps it to one read per content.
const harvestedContents = new WeakSet();
let harvestTileset = null;

function harvestFromContent(content) {
  if (!content) return;
  if (!harvestedContents.has(content)) {
    const n = content.featuresLength || 0;
    if (n > 0) {
      const f = content.getFeature(0);
      let ids = null;
      if (f) { try { ids = f.getPropertyIds(); } catch (_) { ids = null; } }
      if (ids && ids.length) registerFeatureProps(ids);
      harvestedContents.add(content);
    }
  }
  const inner = content.innerContents; // composite tiles
  if (inner) for (let i = 0; i < inner.length; i++) harvestFromContent(inner[i]);
}

function onTileHarvest(tile) {
  harvestFromContent(tile.content);
}

// Begin harvesting property names for the current tileset.
function startPropHarvest() {
  const ts = state.tileset;
  if (!ts || harvestTileset === ts) return;
  harvestTileset = ts;
  ts.tileVisible.addEventListener(onTileHarvest);
}

// ---- apply / clear --------------------------------------------------------

function applyFilter() {
  const input = $("filterInput");
  keyword = ((input && input.value) || "").trim();
  active = keyword.length > 0 && selectedProps.size > 0;
  version++;                 // force every visible feature to re-evaluate once
  if (active) ensureHandler();
  updateMsg();
}

function clearFilter() {
  const input = $("filterInput");
  if (input) input.value = "";
  keyword = "";
  active = false;
  version++;                 // repaints visible features back to natural
  updateMsg();
}

function scheduleApply() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(applyFilter, 150);
}

// ---- panel UI -------------------------------------------------------------

function isPanelOpen() {
  const el = $("filter");
  return !!el && el.classList.contains("show");
}

function renderPropList() {
  const wrap = $("filterProps");
  if (!wrap) return;
  const props = [...knownProps].sort((a, b) => a.localeCompare(b));
  if (props.length === 0) {
    wrap.innerHTML = `<div class="filter-empty">${escapeHtml(t("filter.empty"))}</div>`;
    return;
  }
  wrap.innerHTML = props
    .map((p) =>
      `<label class="filter-chk"><input type="checkbox" data-prop="${escapeHtml(p)}"` +
      `${selectedProps.has(p) ? " checked" : ""} /><span>${escapeHtml(p)}</span></label>`
    )
    .join("");
}

function syncSelectionFromDOM() {
  selectedProps.clear();
  document.querySelectorAll('#filterProps input[type="checkbox"]').forEach((cb) => {
    if (cb.checked) selectedProps.add(cb.dataset.prop);
  });
}

function setAll(on) {
  document.querySelectorAll('#filterProps input[type="checkbox"]').forEach((cb) => { cb.checked = on; });
  syncSelectionFromDOM();
  applyFilter();
}

function updateMsg() {
  const msg = $("filterMsg");
  const btn = $("filterBtn");
  if (btn) btn.classList.toggle("active", active);
  if (!msg) return;
  const noProps = keyword.length > 0 && selectedProps.size === 0;
  if (active) {
    msg.textContent = `${t("filter.matching")} "${keyword}"`;
    msg.classList.remove("warn");
  } else if (noProps) {
    msg.textContent = t("filter.noProps");
    msg.classList.add("warn");
  } else {
    msg.textContent = "";
    msg.classList.remove("warn");
  }
}

function openPanel() {
  renderPropList();
  $("filter").classList.add("show");
  updateMsg();
  const input = $("filterInput");
  if (input) input.focus();
}

function closePanel() {
  clearFilter();
  $("filter").classList.remove("show");
}

// ---- public API -----------------------------------------------------------

// Called by inspect.js each time a feature's metadata is read, so the filter's
// property list mirrors what the metadata panel can show.
export function registerFeatureProps(ids) {
  if (!ids) return;
  let changed = false;
  ids.forEach((id) => {
    if (!knownProps.has(id)) { knownProps.add(id); selectedProps.add(id); changed = true; }
  });
  if (changed && isPanelOpen()) renderPropList();
}

// Called by loader.js when a new asset loads: forget the old model's props and
// rebind to the new tileset the next time a filter is applied.
export function resetFilter() {
  knownProps.clear();
  selectedProps.clear();
  keyword = "";
  active = false;
  version++;
  attachedTileset = null;
  const input = $("filterInput");
  if (input) input.value = "";
  if (isPanelOpen()) renderPropList();
  updateMsg();
  startPropHarvest(); // preload every property name for this tileset
}

export function initFilter() {
  const on = (id, ev, fn) => { const el = $(id); if (el) el.addEventListener(ev, fn); };

  on("filterBtn", "click", openPanel);
  on("filterClose", "click", closePanel);
  on("filterClear", "click", clearFilter);
  on("filterAll", "click", () => setAll(true));
  on("filterNone", "click", () => setAll(false));
  on("filterInput", "input", scheduleApply);

  const props = $("filterProps");
  if (props) {
    props.addEventListener("change", (e) => {
      if (e.target && e.target.matches('input[type="checkbox"]')) {
        syncSelectionFromDOM();
        applyFilter();
      }
    });
  }

  onLangChange(() => { if (isPanelOpen()) renderPropList(); updateMsg(); });
}
