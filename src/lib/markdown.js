// Minimal, XSS-safe Markdown renderer. All input is HTML-escaped first; only a fixed
// set of syntax becomes markup, and URLs are allow-listed.
//
// Supported: # ## ### headings, **bold**, *italic*, ~~strike~~, `code`, ```fenced```,
// [links](https://), ![images](https:// or fsimg:id), > quotes, - / 1. lists,
// | tables |, --- rules.
import { escapeHtml, slugify } from "./dom.js";

const UNESC = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };
const unescape = (s) => s.replace(/&(amp|lt|gt|quot|#39);/g, (e) => UNESC[e]);

const SAFE_URL = /^(https?:\/\/|mailto:|\/|#|\.\/)/i;
const safeHref = (url) => (SAFE_URL.test(url) ? url.replace(/"/g, "&quot;") : "#");

function image(alt, url) {
  if (url.startsWith("fsimg:")) {
    const id = url.slice(6).replace(/[^\w-]/g, "");
    return `<img data-fsimg="${id}" alt="${alt}" loading="lazy">`;
  }
  return /^https?:\/\//i.test(url) ? `<img src="${safeHref(url)}" alt="${alt}" loading="lazy">` : "";
}

function inline(text) {
  const codes = [];
  let s = text.replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`);
  s = s
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, url) => image(alt, url))
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
      const href = safeHref(url);
      const ext = /^https?:/i.test(href) ? ' rel="noopener noreferrer" target="_blank"' : "";
      return `<a href="${href}"${ext}>${label}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>");
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
}

const splitRow = (line) => line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

/** @returns {{ html: string, toc: {level:number, id:string, text:string}[] }} */
export function parseMarkdown(source = "") {
  const lines = escapeHtml(String(source).replace(/\r\n?/g, "\n")).split("\n");
  const out = [];
  const toc = [];
  const usedIds = new Set();
  let para = [];
  let list = null;
  let quote = [];

  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join("<br>"))}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`<${list.type}>${list.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${list.type}>`); list = null; } };
  const flushQuote = () => { if (quote.length) { out.push(`<blockquote>${parseMarkdown(unescape(quote.join("\n"))).html}</blockquote>`); quote = []; } };
  const flushAll = () => { flushPara(); flushList(); flushQuote(); };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m;

    if (/^```/.test(line)) {
      flushAll();
      const buf = [];
      while (++i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i]);
      out.push(`<div class="code"><button type="button" class="code__copy" data-copy>คัดลอก</button><pre><code>${buf.join("\n")}</code></pre></div>`);
      continue;
    }

    // Table: header row, then a |---|---| separator row.
    if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1] || "")) {
      flushAll();
      const head = splitRow(line);
      const rows = [];
      i += 2;
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(splitRow(lines[i++]));
      i--;
      out.push(`<div class="table-wrap"><table><thead><tr>${head.map((h) => `<th>${inline(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }

    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
      flushAll();
      const level = m[1].length + 1; // h1 is reserved for the post title
      const text = unescape(m[2].replace(/[*_`~]/g, ""));
      let id = slugify(text) || `section-${toc.length + 1}`;
      while (usedIds.has(id)) id += "-";
      usedIds.add(id);
      toc.push({ level, id, text });
      out.push(`<h${level} id="${escapeHtml(id)}">${inline(m[2])}</h${level}>`);
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
  return { html: out.join("\n"), toc };
}

export const renderMarkdown = (source) => parseMarkdown(source).html;

export function plainText(source = "") {
  return String(source)
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s*\|.*\|\s*$/gm, "")
    .replace(/[#>*_`~|-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function excerptFrom(source = "", max = 180) {
  const plain = plainText(source);
  return plain.length > max ? plain.slice(0, max).trimEnd() + "…" : plain;
}
