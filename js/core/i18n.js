// core/i18n.js
// Minimal i18n: en/ja dictionaries, t(key), live language switching, and a
// declarative DOM applier driven by data-i18n* attributes.

export const translations = {
  en: {
    "connect.sub": "Load a 3D Tiles asset from Cesium ion and inspect it.",
    "connect.tokenLabel": "ion access token",
    "connect.assetLabel": "Asset ID",
    "connect.load": "Load asset",

    "status.needToken": "Enter an ion access token.",
    "status.needAsset": "Enter a numeric asset ID.",
    "status.connecting": "Connecting to Cesium ion…",
    "status.loading": "Loading 3D Tiles…",
    "status.loadFailed": "Load failed: ",

    "tool.inspect": "Inspect",
    "tool.distance": "Distance",
    "tool.area": "Area",
    "tool.position": "Position",
    "tool.clear": "Clear",
    "tool.recenter": "Recenter",
    "tool.presentation": "Presentation",
    "tool.terrain": "Terrain",
    "tool.filter": "Filter",

    "filter.title": "Filter objects",
    "filter.propsLabel": "Properties to search",
    "filter.keywordLabel": "Keyword",
    "filter.placeholder": "Type to match (contains)\u2026",
    "filter.all": "All",
    "filter.none": "None",
    "filter.clear": "Clear",
    "filter.empty": "No properties available to filter yet.",
    "filter.matching": "Isolating matches for",
    "filter.noProps": "Select at least one property to search.",

    "explode.title": "Disassemble",
    "explode.note": "Rigid per-feature disassembly: every element (feature ID) is translated as a rigid body away from the model centre. For a curated layout, bake a per-feature <code>centroid</code> into the tileset metadata (see comments in source).",

    "meta.title": "Feature metadata",
    "meta.empty": "This feature carries no per-feature metadata in the tileset. ion's BIM tiling often strips embedded attributes — read them from your external metadata store keyed by feature/element ID instead.",

    "readout.distanceHint": "Click points to measure <b>distance</b>.",
    "readout.areaHint": "Click 3+ points to measure <b>area</b>.",
    "readout.distanceLabel": "Distance",
    "readout.areaLabel": "Area",
    "readout.segments": "segments",
    "readout.points": "pts",
    "readout.addPoint": "add one more point",
    "readout.noPick": "pickPosition not supported on this GPU.",

    "pos.title": "Position model",
    "pos.lat": "Latitude",
    "pos.lon": "Longitude",
    "pos.height": "Height (m)",
    "pos.heading": "Heading °",
    "pos.pitch": "Pitch °",
    "pos.roll": "Roll °",
    "pos.placeCam": "Place at camera",
    "pos.clickMap": "Click on map",
    "pos.cancel": "Cancel",
    "pos.fly": "Fly to model",
    "pos.save": "Save",
    "pos.reset": "Reset",
    "pos.hint": "Click a point on the globe to place the model there.",
    "pos.saving": "Saving…",
    "pos.saved": "Saved to Cesium ion.",
    "pos.savedLocalOnly": "Saved to this browser only.",
    "pos.aimGround": "Aim the camera at the ground first.",
  },

  ja: {
    "connect.sub": "Cesium ion から 3D Tiles アセットを読み込んで確認します。",
    "connect.tokenLabel": "ion アクセストークン",
    "connect.assetLabel": "アセット ID",
    "connect.load": "アセットを読み込む",

    "status.needToken": "ion アクセストークンを入力してください。",
    "status.needAsset": "数値のアセット ID を入力してください。",
    "status.connecting": "Cesium ion に接続中…",
    "status.loading": "3D Tiles を読み込み中…",
    "status.loadFailed": "読み込みに失敗しました: ",

    "tool.inspect": "検査",
    "tool.distance": "距離",
    "tool.area": "面積",
    "tool.position": "配置",
    "tool.clear": "クリア",
    "tool.recenter": "再センタリング",
    "tool.presentation": "プレゼン",
    "tool.terrain": "地形",
    "tool.filter": "フィルター",

    "filter.title": "オブジェクトをフィルター",
    "filter.propsLabel": "検索するプロパティ",
    "filter.keywordLabel": "キーワード",
    "filter.placeholder": "一致する語を入力（部分一致）…",
    "filter.all": "すべて",
    "filter.none": "なし",
    "filter.clear": "クリア",
    "filter.empty": "フィルターできるプロパティはまだありません。",
    "filter.matching": "一致をアイソレート中:",
    "filter.noProps": "検索するプロパティを少なくとも1つ選択してください。",

    "explode.title": "分解",
    "explode.note": "フィーチャーごとの剛体分解: 各要素（フィーチャー ID）を剛体としてモデル中心から外側へ移動します。整ったレイアウトにするには、タイルセットのメタデータにフィーチャーごとの <code>centroid</code> を埋め込みます（ソースのコメント参照）。",

    "meta.title": "フィーチャーのメタデータ",
    "meta.empty": "このフィーチャーにはタイルセット内のメタデータがありません。ion の BIM タイル化では属性が削除されることが多いため、フィーチャー／要素 ID をキーにした外部メタデータストアから読み取ってください。",

    "readout.distanceHint": "点をクリックして<b>距離</b>を計測します。",
    "readout.areaHint": "3点以上クリックして<b>面積</b>を計測します。",
    "readout.distanceLabel": "距離",
    "readout.areaLabel": "面積",
    "readout.segments": "区間",
    "readout.points": "点",
    "readout.addPoint": "あと1点追加してください",
    "readout.noPick": "この GPU では pickPosition がサポートされていません。",

    "pos.title": "モデルを配置",
    "pos.lat": "緯度",
    "pos.lon": "経度",
    "pos.height": "高さ (m)",
    "pos.heading": "方位角 °",
    "pos.pitch": "ピッチ °",
    "pos.roll": "ロール °",
    "pos.placeCam": "カメラ位置に配置",
    "pos.clickMap": "地図をクリック",
    "pos.cancel": "キャンセル",
    "pos.fly": "モデルへ移動",
    "pos.save": "保存",
    "pos.reset": "リセット",
    "pos.hint": "地球上の点をクリックしてモデルを配置します。",
    "pos.saving": "保存中…",
    "pos.saved": "Cesium ion に保存しました。",
    "pos.savedLocalOnly": "このブラウザのみに保存しました。",
    "pos.aimGround": "先にカメラを地面に向けてください。",
  },
};

let current = "en";
const listeners = [];

export function getLang() { return current; }

export function t(key) {
  return (translations[current] && translations[current][key]) ??
         translations.en[key] ?? key;
}

export function onLangChange(fn) { listeners.push(fn); }

// Apply translations declaratively:
//   data-i18n        → textContent
//   data-i18n-html   → innerHTML
//   data-i18n-ph     → placeholder
//   data-i18n-title  → title attribute
export function applyI18n(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  root.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  root.querySelectorAll("[data-i18n-title]").forEach((el) => { el.title = t(el.dataset.i18nTitle); });
}

export function setLang(lang) {
  if (!translations[lang]) return;
  current = lang;
  localStorage.setItem("lang", lang);
  document.documentElement.lang = lang;
  applyI18n();
  listeners.forEach((fn) => fn(lang));
}

export function initI18n() {
  current = localStorage.getItem("lang") || "en";
  document.documentElement.lang = current;
  applyI18n();
  return current;
}
