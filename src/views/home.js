import { html, raw, formatDate, setTitle, safeUrl } from "../lib/dom.js";
import { listPublished } from "../services/posts.js";

export const tagList = (tags = []) =>
  tags.length ? html`<ul class="tags" aria-label="แท็ก">${tags.map((t) => raw(html`<li>${t}</li>`))}</ul>` : "";

const isoDate = (t) => (t?.toDate ? t.toDate().toISOString() : "");
const postHref = (p) => `#/p/${encodeURIComponent(p.id)}`;

export async function homeView(el) {
  setTitle("");
  el.innerHTML = `<p class="state">กำลังเปิดสมุด…</p>`;
  const posts = await listPublished();

  if (!posts.length) {
    el.innerHTML = html`
      <section class="lead-entry">
        <h1>สมุดเล่มนี้ยังว่างอยู่</h1>
        <p class="lead-entry__excerpt">บันทึกแรกกำลังจะมา กลับมาอ่านใหม่เร็ว ๆ นี้</p>
      </section>`;
    return;
  }

  const [latest, ...rest] = posts;
  const cover = latest.coverUrl
    ? raw(html`<img class="lead-entry__cover" src="${safeUrl(latest.coverUrl)}" alt="">`)
    : "";

  const contents = rest.length
    ? raw(html`
      <section class="contents" aria-labelledby="contents-heading">
        <h2 id="contents-heading">บันทึกก่อนหน้า</h2>
        <ol>
          ${rest.map((p) => raw(html`
            <li><a href="${postHref(p)}">
              <span class="contents__title">${p.title}</span>
              <time class="contents__date" datetime="${isoDate(p.publishedAt)}">${formatDate(p.publishedAt, { dateStyle: "medium" })}</time>
            </a></li>`))}
        </ol>
      </section>`)
    : "";

  el.innerHTML = html`
    <article class="lead-entry">
      <p class="lead-entry__date"><time datetime="${isoDate(latest.publishedAt)}">${formatDate(latest.publishedAt)}</time></p>
      <h1><a href="${postHref(latest)}">${latest.title}</a></h1>
      ${raw(tagList(latest.tags))}
      ${cover}
      <p class="lead-entry__excerpt">${latest.excerpt}</p>
      <a class="btn btn--ghost" href="${postHref(latest)}">อ่านบันทึกนี้</a>
    </article>
    ${contents}
  `;
}
