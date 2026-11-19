const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (c) => ESC[c]);

/** Tagged template that escapes every interpolation unless wrapped with raw(). */
export function html(strings, ...values) {
  return strings.reduce((out, str, i) => {
    if (i >= values.length) return out + str;
    const v = values[i];
    const rendered = Array.isArray(v)
      ? v.map((x) => (x?.__raw ? x.value : escapeHtml(x))).join("")
      : v?.__raw ? v.value : escapeHtml(v ?? "");
    return out + str + rendered;
  }, "");
}

export const raw = (value) => ({ __raw: true, value: String(value) });

/** Only allow http(s) and relative URLs in user-provided links/images. */
export const safeUrl = (url = "") => (/^(https?:\/\/|\/|\.\/)/i.test(url.trim()) ? url.trim() : "");

export function formatDate(date, opts = { dateStyle: "long" }) {
  if (!date) return "";
  const d = date.toDate ? date.toDate() : new Date(date);
  return new Intl.DateTimeFormat("th-TH", opts).format(d);
}

let toastTimer;
export function toast(message, { error = false } = {}) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.className = error ? "toast toast--error" : "toast";
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 3200);
}

export function setTitle(title) {
  document.title = title ? `${title} — ตุ๊กตา` : "ตุ๊กตา — สมุดบันทึก";
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
