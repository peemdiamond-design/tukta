// Minimal, XSS-safe Markdown renderer. All input is HTML-escaped first;
// only a fixed set of syntax is converted into markup, and URLs are allow-listed.
import { escapeHtml } from "./dom.js";

const UNESC = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };
const unescape = (s) => s.replace(/&(amp|lt|gt|quot|#39);/g, (e) => UNESC[e]);

const SAFE_URL = /^(https?:\/\/|mailto:|\/|#|\.\/)/i;
const safeUrl = (url) => (SAFE_URL.test(url) ? url.replace(/"/g, "&quot;") : "#");

function inline(text) {
  const codes = [];
  let s = text.replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`);
  s = s
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, url) => `<img src="${safeUrl(url)}" alt="${alt}" loading="lazy">`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
      const href = safeUrl(url);
      const ext = /^https?:/i.test(href) ? ' rel="noopener noreferrer" target="_blank"' : "";
      return `<a href="${href}"${ext}>${label}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>");
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
}

export function renderMarkdown(source = "") {
  const lines = escapeHtml(source.replace(/\r\n?/g, "\n")).split("\n");
  const out = [];
  let para = [];
  let list = null; // { type: 'ul'|'ol', items: [] }
  let quote = [];

  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join("<br>"))}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`<${list.type}>${list.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${list.type}>`); list = null; } };
  const flushQuote = () => { if (quote.length) { out.push(`<blockquote>${renderMarkdown(unescape(quote.join("\n")))}</blockquote>`); quote = []; } };
  const flushAll = () => { flushPara(); flushList(); flushQuote(); };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^```/.test(line)) {
      flushAll();
      const buf = [];
      while (++i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i]);
      out.push(`<pre><code>${buf.join("\n")}</code></pre>`);
      continue;
    }
    let m;
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
      flushAll();
      const level = Math.min(m[1].length + 1, 4); // h1 is reserved for the post title
      out.push(`<h${level}>${inline(m[2])}</h${level}>`);
    } else if (/^(\*\s*){3,}$|^(-\s*){3,}$/.test(line.trim())) {
      flushAll();
      out.push("<hr>");
    } else if ((m = line.match(/^&gt;\s?(.*)$/))) {
      flushPara(); flushList();
      quote.push(m[1]);
    } else if ((m = line.match(/^\s*[-*]\s+(.*)$/))) {
      flushPara(); flushQuote();
      if (list?.type !== "ul") { flushList(); list = { type: "ul", items: [] }; }
      list.items.push(m[1]);
    } else if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
      flushPara(); flushQuote();
      if (list?.type !== "ol") { flushList(); list = { type: "ol", items: [] }; }
      list.items.push(m[1]);
    } else if (!line.trim()) {
      flushAll();
    } else {
      flushList(); flushQuote();
      para.push(line);
    }
  }
  flushAll();
  return out.join("\n");
}

export function excerptFrom(source = "", max = 180) {
  const plain = source
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > max ? plain.slice(0, max).trimEnd() + "…" : plain;
}
