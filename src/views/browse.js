// Tag pages, monthly archive and search.
import { html, raw, debounce, postHref } from "../lib/dom.js";
import { setMeta } from "../lib/seo.js";
import { listPublished, searchPosts, tagCounts } from "../services/posts.js";
import { navigate } from "../lib/router.js";
import { contentsList, loading } from "./components.js";

export async function tagView(el, { tag }) {
  el.innerHTML = loading();
  const posts = (await listPublished()).filter((p) => (p.tags || []).includes(tag));
  setMeta({ title: `แท็ก ${tag}`, description: `บันทึกทั้งหมดในหมวด ${tag}`, path: `/tag/${tag}` });
  el.innerHTML = html`
    <section class="listing">
      <p class="eyebrow-link"><a href="#/archive">บันทึกทั้งหมด</a></p>
      <h1>${tag}</h1>
      <p class="listing__count">${posts.length} บันทึก</p>
      ${posts.length ? raw(contentsList(posts)) : raw(`<p class="state">ยังไม่มีบันทึกในหมวดนี้</p>`)}
    </section>`;
}

export async function archiveView(el) {
  el.innerHTML = loading();
  const posts = await listPublished();
  setMeta({ title: "บันทึกทั้งหมด", path: "/archive" });

  const groups = new Map();
  for (const p of posts) {
    const d = p.publishedAt?.toDate?.() ?? new Date();
    const key = new Intl.DateTimeFormat("th-TH", { year: "numeric", month: "long" }).format(d);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  const tags = tagCounts(posts);

  el.innerHTML = html`
    <section class="listing">
      <h1>บันทึกทั้งหมด</h1>
      <p class="listing__count">${posts.length} บันทึก</p>
      ${tags.length ? raw(html`<ul class="tags tags--cloud">${tags.map(([t, n]) => raw(html`<li><a href="#/tag/${encodeURIComponent(t)}">${t} <small>${n}</small></a></li>`))}</ul>`) : ""}
      ${[...groups.entries()].map(([month, list]) => raw(html`
        <section class="archive-month">
          <h2>${month}</h2>
          ${raw(contentsList(list))}
        </section>`))}
      ${posts.length ? "" : raw(`<p class="state">ยังไม่มีบันทึก</p>`)}
    </section>`;
}

export async function searchView(el, { query }) {
  const term = query.get("q") || "";
  setMeta({ title: term ? `ค้นหา “${term}”` : "ค้นหา", path: "/search" });
  el.innerHTML = html`
    <section class="listing">
      <h1>ค้นหาบันทึก</h1>
      <form class="search" role="search" data-search>
        <label for="q" class="visually-hidden">คำค้น</label>
        <input id="q" name="q" type="search" value="${term}" placeholder="พิมพ์ชื่อเรื่อง แท็ก หรือคำในบันทึก" autocomplete="off">
        <button class="btn" type="submit">ค้นหา</button>
      </form>
      <p class="listing__count" data-count aria-live="polite"></p>
      <div data-results>${raw(loading())}</div>
    </section>`;

  const posts = await listPublished();
  const input = el.querySelector("#q");
  const results = el.querySelector("[data-results]");
  const count = el.querySelector("[data-count]");

  const run = (q) => {
    if (!q.trim()) {
      count.textContent = "";
      results.innerHTML = `<p class="state">ลองค้นหาด้วยชื่อเรื่อง แท็ก หรือคำที่จำได้จากบันทึก</p>`;
      return;
    }
    const found = searchPosts(posts, q);
    count.textContent = found.length ? `พบ ${found.length} บันทึก` : "";
    results.innerHTML = found.length
      ? contentsList(found)
      : html`<p class="state">ไม่พบบันทึกที่ตรงกับ “${q}” ลองใช้คำที่สั้นลงหรือคำอื่น</p>`;
  };

  // Keep the URL in sync without re-rendering the page on every keystroke.
  const sync = debounce((q) => history.replaceState(null, "", `#/search${q ? `?q=${encodeURIComponent(q)}` : ""}`), 300);
  input.addEventListener("input", () => { run(input.value); sync(input.value); });
  el.querySelector("[data-search]").addEventListener("submit", (e) => {
    e.preventDefault();
    const first = results.querySelector("a");
    if (first) location.hash = first.getAttribute("href");
  });
  run(term);
  input.focus();
}

export { navigate, postHref };
