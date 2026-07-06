// core/utils.js
// Tiny DOM + formatting helpers shared across modules.

export const $ = (id) => document.getElementById(id);

export function setStatus(msg, cls) {
  const el = $("status");
  if (!el) return;
  el.textContent = msg;
  el.className = cls || "";
}

export function fmt(n) {
  return n >= 1000
    ? n.toLocaleString(undefined, { maximumFractionDigits: 1 })
    : n.toFixed(2);
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}
