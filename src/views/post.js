import { html, raw, postHref, formatNumber, timeAgo, toast, safeUrl } from "../lib/dom.js";
import { parseMarkdown } from "../lib/markdown.js";
import { setMeta, articleJsonLd } from "../lib/seo.js";
import { getPost, listPublished, relatedPosts } from "../services/posts.js";
import { session, signInWithGoogle } from "../services/auth.js";
import { listComments, addComment, deleteComment, likeState, toggleLike, recordView } from "../services/engagement.js";
import { hydrateImages, resolveImage } from "../services/site.js";
import { SITE } from "../config/firebase-config.js";
import { tagList, postMeta, coverImg, contentsList, shareBar, bindShare, bindCodeCopy, subscribeBox, bindSubscribe, loading } from "./components.js";
import { notFoundView } from "./notfound.js";

let cleanup = () => {};

export async function postView(el, { id }) {
  cleanup();
  el.innerHTML = loading("กำลังเปิดหน้า…");

  let post = null;
  try {
    post = await getPost(id);
  } catch {
    post = null; // permission-denied on drafts for non-admins → treat as missing
  }
  if (!post || (post.status !== "published" && !session.isAdmin)) return notFoundView(el);

  const url = `${SITE.url}/#/p/${encodeURIComponent(post.id)}`;
  const cover = await resolveImage(safeUrl(post.coverUrl)).catch(() => "");
  setMeta({
    title: post.title,
    description: post.excerpt,
    image: /^https?:/.test(cover) ? cover : undefined,
    path: `/p/${post.id}`,
    type: "article",
    jsonLd: articleJsonLd(post, url),
  });

  const { html: body, toc } = parseMarkdown(post.content);
  const published = await listPublished().catch(() => []);
  const idx = published.findIndex((p) => p.id === post.id);
  const newer = idx > 0 ? published[idx - 1] : null;
  const older = idx >= 0 && idx < published.length - 1 ? published[idx + 1] : null;
  const related = relatedPosts(post, published);

  el.innerHTML = html`
    <div class="progress" aria-hidden="true"><span></span></div>
    <article class="article">
      <header>
        <p class="article__meta">
          ${raw(postMeta(post))}
          <span aria-hidden="true">/</span>
          <span data-views>…</span>
          ${post.status === "draft" ? raw(` <span class="status status--draft">ฉบับร่าง</span>`) : ""}
        </p>
        <h1>${post.title}</h1>
        ${raw(tagList(post.tags))}
      </header>
      ${raw(coverImg(post.coverUrl, "lead-entry__cover"))}

      ${toc.length >= 3 ? raw(html`
        <nav class="toc" aria-labelledby="toc-h">
          <h2 id="toc-h">ในบันทึกนี้</h2>
          <ol>${toc.map((t) => raw(html`<li class="toc--${t.level}"><a href="#" data-toc="${t.id}">${t.text}</a></li>`))}</ol>
        </nav>`) : ""}

      <div class="prose">${raw(body)}</div>

      <footer class="article__foot">
        <button type="button" class="like" data-like aria-pressed="false" disabled>
          <span class="like__icon" aria-hidden="true">♥</span>
          <span data-like-count>0</span>
          <span class="visually-hidden">ถูกใจ</span>
        </button>
        ${raw(shareBar(post))}
      </footer>

      ${session.isAdmin ? raw(html`<p><a class="btn btn--ghost" href="#/admin/edit/${encodeURIComponent(post.id)}">แก้ไขบันทึกนี้</a></p>`) : ""}

      ${newer || older ? raw(html`
        <nav class="pager" aria-label="บันทึกก่อนหน้าและถัดไป">
          ${older ? raw(html`<a class="pager__prev" href="${postHref(older.id)}"><small>บันทึกก่อนหน้า</small>${older.title}</a>`) : raw("<span></span>")}
          ${newer ? raw(html`<a class="pager__next" href="${postHref(newer.id)}"><small>บันทึกถัดไป</small>${newer.title}</a>`) : ""}
        </nav>`) : ""}

      <section class="comments" aria-labelledby="comments-h">
        <h2 id="comments-h">ความคิดเห็น <small data-comment-count></small></h2>
        <div data-comment-form></div>
        <ol class="comment-list" data-comments>${raw(loading())}</ol>
      </section>

      ${related.length ? raw(html`
        <section class="related" aria-labelledby="related-h">
          <h2 id="related-h">อ่านต่อ</h2>
          ${raw(contentsList(related))}
        </section>`) : ""}

      ${raw(subscribeBox())}
      <a class="back-link" href="#/">กลับไปที่สารบัญ</a>
    </article>`;

  hydrateImages(el);
  bindCodeCopy(el);
  bindShare(el, post);
  bindSubscribe(el);

  // In-page TOC links: hash routing owns location.hash, so scroll manually.
  el.querySelectorAll("[data-toc]").forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const target = document.getElementById(a.dataset.toc);
      target?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      target?.setAttribute("tabindex", "-1");
      target?.focus({ preventScroll: true });
    })
  );

  // Reading progress bar.
  const bar = el.querySelector(".progress span");
  const article = el.querySelector(".article");
  const onScroll = () => {
    const r = article.getBoundingClientRect();
    const total = r.height - innerHeight;
    bar.style.transform = `scaleX(${Math.min(1, Math.max(0, -r.top / (total > 0 ? total : 1)))})`;
  };
  addEventListener("scroll", onScroll, { passive: true });
  cleanup = () => removeEventListener("scroll", onScroll);

  // Views, likes and comments load after the article is readable.
  if (post.status === "published") {
    recordView(post.id).then((v) => {
      const viewsEl = el.querySelector("[data-views]");
      if (viewsEl) viewsEl.textContent = `อ่านแล้ว ${formatNumber(v)} ครั้ง`;
    });
  } else {
    el.querySelector("[data-views]").textContent = "ยังไม่เผยแพร่";
  }
  setupLikes(el, post);
  setupComments(el, post);
}

async function setupLikes(el, post) {
  const btn = el.querySelector("[data-like]");
  const countEl = el.querySelector("[data-like-count]");
  let state = { count: 0, liked: false };
  const paint = () => {
    countEl.textContent = formatNumber(state.count);
    btn.setAttribute("aria-pressed", String(state.liked));
    btn.title = state.liked ? "เลิกถูกใจ" : "ถูกใจบันทึกนี้";
  };
  try {
    state = await likeState(post.id);
  } catch { /* likes are optional */ }
  paint();
  btn.disabled = post.status !== "published";
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    const prev = { ...state };
    state = { liked: !state.liked, count: state.count + (state.liked ? -1 : 1) }; // optimistic
    paint();
    try {
      await toggleLike(post.id, prev.liked);
    } catch {
      state = prev;
      paint();
      toast("กดถูกใจไม่สำเร็จ ลองใหม่อีกครั้ง", { error: true });
    }
    btn.disabled = false;
  });
}

async function setupComments(el, post) {
  const listEl = el.querySelector("[data-comments]");
  const formSlot = el.querySelector("[data-comment-form]");
  const countEl = el.querySelector("[data-comment-count]");
  let comments = [];

  const renderList = () => {
    countEl.textContent = comments.length ? `(${comments.length})` : "";
    listEl.innerHTML = comments.length
      ? comments.map((c) => html`
          <li class="comment">
            ${c.photoURL ? raw(html`<img class="comment__avatar" src="${safeUrl(c.photoURL)}" alt="" referrerpolicy="no-referrer">`) : raw(`<span class="comment__avatar comment__avatar--blank" aria-hidden="true"></span>`)}
            <div>
              <p class="comment__head"><strong>${c.name}</strong> <time>${timeAgo(c.createdAt)}</time></p>
              <p class="comment__body">${c.body}</p>
              ${session.isAdmin || session.user?.uid === c.uid ? raw(html`<button type="button" class="link-btn" data-del-comment="${c.id}">ลบ</button>`) : ""}
            </div>
          </li>`).join("")
      : `<li class="state">ยังไม่มีความคิดเห็น เป็นคนแรกที่เขียนถึงบันทึกนี้</li>`;
    listEl.querySelectorAll("[data-del-comment]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("ลบความคิดเห็นนี้?")) return;
        try {
          await deleteComment(b.dataset.delComment);
          comments = comments.filter((c) => c.id !== b.dataset.delComment);
          renderList();
          toast("ลบความคิดเห็นแล้ว");
        } catch {
          toast("ลบไม่สำเร็จ", { error: true });
        }
      })
    );
  };

  const renderForm = () => {
    if (post.status !== "published") {
      formSlot.innerHTML = `<p class="state">เปิดความคิดเห็นหลังเผยแพร่</p>`;
      return;
    }
    if (!session.isMember) {
      formSlot.innerHTML = `<p class="comment-login">เข้าสู่ระบบด้วย Google เพื่อแสดงความคิดเห็น <button type="button" class="btn btn--ghost" data-login>เข้าสู่ระบบ</button></p>`;
      formSlot.querySelector("[data-login]").addEventListener("click", async () => {
        try {
          await signInWithGoogle();
        } catch (err) {
          if (err.code !== "auth/popup-closed-by-user") toast("เข้าสู่ระบบไม่สำเร็จ", { error: true });
        }
      });
      return;
    }
    formSlot.innerHTML = html`
      <form class="comment-form" novalidate>
        <label for="c-body">แสดงความคิดเห็นในชื่อ ${session.user.displayName || "ผู้อ่าน"}</label>
        <textarea id="c-body" name="body" rows="3" maxlength="2000" required></textarea>
        <div class="form__actions"><button class="btn" type="submit">ส่งความคิดเห็น</button><small data-left>2000</small></div>
      </form>`;
    const form = formSlot.querySelector("form");
    const left = form.querySelector("[data-left]");
    form.body.addEventListener("input", () => (left.textContent = 2000 - form.body.value.length));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const body = form.body.value.trim();
      if (!body) return toast("พิมพ์ความคิดเห็นก่อนส่ง", { error: true }), form.body.focus();
      const btn = form.querySelector("button");
      btn.disabled = true;
      try {
        const c = await addComment(post.id, body);
        comments.push({ ...c, createdAt: new Date() });
        renderList();
        form.reset();
        left.textContent = "2000";
        toast("ส่งความคิดเห็นแล้ว");
      } catch {
        toast("ส่งความคิดเห็นไม่สำเร็จ ลองใหม่อีกครั้ง", { error: true });
      }
      btn.disabled = false;
    });
  };

  renderForm();
  try {
    comments = await listComments(post.id);
  } catch {
    comments = [];
  }
  renderList();
}
