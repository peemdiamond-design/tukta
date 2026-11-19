import { html, raw, safeUrl } from "../lib/dom.js";
import { setMeta } from "../lib/seo.js";
import { renderMarkdown } from "../lib/markdown.js";
import { getSettings, hydrateImages } from "../services/site.js";
import { coverImg, subscribeBox, bindSubscribe, loading } from "./components.js";

const SOCIAL = [
  ["facebook", "Facebook", (v) => (/^https?:/.test(v) ? v : `https://facebook.com/${v}`)],
  ["instagram", "Instagram", (v) => (/^https?:/.test(v) ? v : `https://instagram.com/${v.replace(/^@/, "")}`)],
  ["x", "X", (v) => (/^https?:/.test(v) ? v : `https://x.com/${v.replace(/^@/, "")}`)],
  ["line", "LINE", (v) => (/^https?:/.test(v) ? v : `https://line.me/ti/p/~${v.replace(/^@/, "")}`)],
  ["email", "อีเมล", (v) => `mailto:${v}`],
];

export async function aboutView(el) {
  el.innerHTML = loading();
  const s = await getSettings();
  setMeta({ title: "เกี่ยวกับ", description: s.description, path: "/about" });
  const links = SOCIAL.filter(([k]) => s.socials?.[k]).map(([k, label, toUrl]) => {
    const href = k === "email" ? toUrl(s.socials[k]) : safeUrl(toUrl(s.socials[k]));
    return raw(html`<li><a class="chip" href="${href}" ${k === "email" ? "" : raw('target="_blank" rel="me noopener noreferrer"')}>${label}</a></li>`);
  });

  el.innerHTML = html`
    <article class="article about">
      ${s.avatarUrl ? raw(coverImg(s.avatarUrl, "about__avatar")) : ""}
      <h1>เกี่ยวกับ${s.name}</h1>
      <div class="prose">${raw(renderMarkdown(s.about))}</div>
      ${links.length ? raw(html`<ul class="social">${links}</ul>`) : ""}
      ${raw(subscribeBox())}
    </article>`;
  hydrateImages(el);
  bindSubscribe(el);
}
