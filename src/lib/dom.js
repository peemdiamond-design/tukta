const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (c) => ESC[c]);

/** Marks a string as already-safe HTML so html`` will not escape it. */
export const raw = (value) => ({ __raw: true, value: String(value ?? "") });

const render = (v) => {
  if (v === null || v === undefined || v === false) return "";
  if (Array.isArray(v)) return v.map(render).join("");
  if (v.__raw) return v.value;
  return escapeHtml(v);
};

/** Tagged template that escapes every interpolation unless wrapped with raw(). */
export function html(strings, ...values) {
  return strings.reduce((out, str, i) => out + str + (i < values.length ? render(values[i]) : ""), "");
}

/** Only allow http(s), relative, and Firestore-image URLs in user-provided links/images. */
export const safeUrl = (url = "") => {
  const u = String(url).trim();
  return /^(https?:\/\/|\/|\.\/|fsimg:)/i.test(u) ? u : "";
};

export const toDate = (t) => (!t ? null : t.toDate ? t.toDate() : new Date(t));
export const isoDate = (t) => toDate(t)?.toISOString() ?? "";

export function formatDate(date, opts = { dateStyle: "long" }) {
  const d = toDate(date);
  return d ? new Intl.DateTimeFormat("th-TH", opts).format(d) : "";
}

export function timeAgo(date) {
  const d = toDate(date);
  if (!d) return "";
  const s = (Date.now() - d.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("th", { numeric: "auto" });
  if (s < 60) return "เมื่อสักครู่";
  if (s < 3600) return rtf.format(-Math.round(s / 60), "minute");
  if (s < 86400) return rtf.format(-Math.round(s / 3600), "hour");
  if (s < 86400 * 30) return rtf.format(-Math.round(s / 86400), "day");
  return formatDate(d, { dateStyle: "medium" });
}

export const formatNumber = (n = 0) => new Intl.NumberFormat("th-TH", { notation: "compact" }).format(n);

let toastTimer;
export function toast(message, { error = false } = {}) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.className = error ? "toast toast--error" : "toast";
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 3200);
}

export function slugify(text) {
  return String(text)
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const debounce = (fn, ms = 250) => {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
};

/** Thai has no spaces between words, so estimate by characters (~ 900 chars/min) plus Latin words. */
export function readingMinutes(text = "") {
  const thai = (text.match(/[฀-๿]/g) || []).length;
  const latinWords = (text.replace(/[฀-๿]/g, " ").match(/\b\w+\b/g) || []).length;
  return Math.max(1, Math.round(thai / 900 + latinWords / 220));
}

export const postHref = (id) => `#/p/${encodeURIComponent(id)}`;
export const tagHref = (tag) => `#/tag/${encodeURIComponent(tag)}`;
