import { html, raw, formatDate, setTitle, safeUrl } from "../lib/dom.js";
import { renderMarkdown } from "../lib/markdown.js";
import { getPost } from "../services/posts.js";
import { session } from "../services/auth.js";
import { tagList } from "./home.js";
import { notFoundView } from "./notfound.js";

export async function postView(el, { id }) {
  el.innerHTML = `<p class="state">กำลังเปิดหน้า…</p>`;
  let post = null;
  try {
    post = await getPost(id);
  } catch {
    post = null; // permission-denied on drafts for non-admins → treat as missing
  }
  if (!post || (post.status !== "published" && !session.isAdmin)) return notFoundView(el);

  setTitle(post.title);
  const date = post.publishedAt ?? post.updatedAt;
  el.innerHTML = html`
    <article class="article">
      <p class="article__meta">
        <time datetime="${date?.toDate ? date.toDate().toISOString() : ""}">${formatDate(date)}</time>
        ${post.status === "draft" ? raw(` <span class="status status--draft">ฉบับร่าง</span>`) : ""}
      </p>
      <h1>${post.title}</h1>
      ${raw(tagList(post.tags))}
      ${post.coverUrl ? raw(html`<img class="lead-entry__cover" src="${safeUrl(post.coverUrl)}" alt="">`) : ""}
      <div class="prose">${raw(renderMarkdown(post.content))}</div>
      ${session.isAdmin ? raw(html`<p><a class="btn btn--ghost" href="#/admin/edit/${encodeURIComponent(post.id)}">แก้ไขบันทึกนี้</a></p>`) : ""}
      <a class="back-link" href="#/">กลับไปที่สารบัญ</a>
    </article>`;
}
