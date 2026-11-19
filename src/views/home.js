import { html, raw, postHref } from "../lib/dom.js";
import { setMeta } from "../lib/seo.js";
import { listPublished, tagCounts } from "../services/posts.js";
import { getSettings, hydrateImages } from "../services/site.js";
import { SITE } from "../config/firebase-config.js";
import { tagList, postMeta, coverImg, contentsList, subscribeBox, bindSubscribe, loading } from "./components.js";

export async function homeView(el) {
  el.innerHTML = loading("กำลังเปิดสมุด…");
  const [posts, settings] = await Promise.all([listPublished(), getSettings()]);
  setMeta({ description: settings.description });

  if (!posts.length) {
    el.innerHTML = html`
      <section class="lead-entry">
        <h1>สมุดเล่มนี้ยังว่างอยู่</h1>
        <p class="lead-entry__excerpt">บันทึกแรกกำลังจะมา กลับมาอ่านใหม่เร็ว ๆ นี้</p>
      </section>
      ${raw(subscribeBox())}`;
    bindSubscribe(el);
    return;
  }

  // Pinned post leads; otherwise the newest one.
  const lead = posts.find((p) => p.featured) ?? posts[0];
  const rest = posts.filter((p) => p !== lead);
  const tags = tagCounts(posts).slice(0, 12);
  let shown = SITE.pageSize;

  el.innerHTML = html`
    <article class="lead-entry">
      <p class="lead-entry__date">${lead.featured ? raw(`<span class="pin">ปักหมุด</span>`) : ""}${raw(postMeta(lead))}</p>
      <h1><a href="${postHref(lead.id)}">${lead.title}</a></h1>
      ${raw(tagList(lead.tags))}
      ${raw(coverImg(lead.coverUrl, "lead-entry__cover"))}
      <p class="lead-entry__excerpt">${lead.excerpt}</p>
      <a class="btn btn--ghost" href="${postHref(lead.id)}">อ่านบันทึกนี้</a>
    </article>

    <div class="home-grid">
      ${rest.length ? raw(html`
        <section class="contents" aria-labelledby="contents-heading">
          <h2 id="contents-heading">บันทึกก่อนหน้า</h2>
          <div data-list></div>
          <button class="btn btn--ghost" type="button" data-more hidden>ดูบันทึกเพิ่ม</button>
        </section>`) : ""}
      <aside class="side">
        ${tags.length ? raw(html`
          <section aria-labelledby="tags-h">
            <h2 id="tags-h">หมวดที่เขียนบ่อย</h2>
            <ul class="tags tags--cloud">${tags.map(([t, n]) => raw(html`<li><a href="#/tag/${encodeURIComponent(t)}">${t} <small>${n}</small></a></li>`))}</ul>
            <p><a href="#/archive">ดูบันทึกทั้งหมดตามเดือน</a></p>
          </section>`) : ""}
        ${raw(subscribeBox())}
      </aside>
    </div>`;

  const listEl = el.querySelector("[data-list]");
  const moreBtn = el.querySelector("[data-more]");
  const renderList = () => {
    if (!listEl) return;
    listEl.innerHTML = contentsList(rest.slice(0, shown));
    moreBtn.hidden = shown >= rest.length;
  };
  renderList();
  moreBtn?.addEventListener("click", () => {
    shown += SITE.pageSize;
    renderList();
    listEl.querySelectorAll("a")[shown - SITE.pageSize]?.focus();
  });

  bindSubscribe(el);
  hydrateImages(el);
}
