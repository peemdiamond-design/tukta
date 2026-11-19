import { html, raw, formatDate, isoDate, postHref, tagHref, safeUrl, toast } from "../lib/dom.js";
import { subscribe } from "../services/site.js";
import { SITE } from "../config/firebase-config.js";

export const tagList = (tags = []) =>
  tags.length
    ? html`<ul class="tags" aria-label="แท็ก">${tags.map((t) => raw(html`<li><a href="${tagHref(t)}">${t}</a></li>`))}</ul>`
    : "";

export const postMeta = (p) => html`
  <time datetime="${isoDate(p.publishedAt ?? p.updatedAt)}">${formatDate(p.publishedAt ?? p.updatedAt)}</time>
  <span aria-hidden="true">/</span>
  <span>อ่าน ${p.readingTime || 1} นาที</span>`;

/** Cover image; fsimg: references are filled in by hydrateImages(). */
export function coverImg(ref, cls = "cover") {
  const url = safeUrl(ref);
  if (!url) return "";
  return url.startsWith("fsimg:")
    ? html`<img class="${cls}" data-fsimg="${url.slice(6)}" alt="" loading="lazy">`
    : html`<img class="${cls}" src="${url}" alt="" loading="lazy">`;
}

/** Table-of-contents style list: title on the left, date on the right. */
export const contentsList = (posts) => html`
  <ol class="contents__list">
    ${posts.map((p) => raw(html`
      <li><a href="${postHref(p.id)}">
        <span class="contents__title">${p.title}</span>
        <time class="contents__date" datetime="${isoDate(p.publishedAt)}">${formatDate(p.publishedAt, { dateStyle: "medium" })}</time>
      </a></li>`))}
  </ol>`;

export function subscribeBox() {
  return html`
    <section class="subscribe" aria-labelledby="sub-h">
      <h2 id="sub-h">รับบันทึกใหม่ทางอีเมล</h2>
      <p>ส่งให้เมื่อมีบันทึกใหม่เท่านั้น ยกเลิกได้ทุกเมื่อ</p>
      <form class="subscribe__form" data-subscribe novalidate>
        <label for="sub-email" class="visually-hidden">อีเมล</label>
        <input id="sub-email" type="email" name="email" placeholder="you@example.com" autocomplete="email" required>
        <button class="btn" type="submit">สมัครรับข่าว</button>
      </form>
    </section>`;
}

export function bindSubscribe(root) {
  root.querySelectorAll("[data-subscribe]").forEach((form) =>
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector("button");
      btn.disabled = true;
      try {
        const added = await subscribe(form.email.value);
        toast(added ? "สมัครรับข่าวแล้ว ขอบคุณที่ติดตาม" : "อีเมลนี้สมัครไว้แล้ว");
        form.reset();
      } catch (err) {
        toast(err.message === "invalid-email" ? "รูปแบบอีเมลไม่ถูกต้อง" : "สมัครไม่สำเร็จ ลองใหม่อีกครั้ง", { error: true });
      } finally {
        btn.disabled = false;
      }
    })
  );
}

export function shareBar(post) {
  const url = `${SITE.url}/#/p/${encodeURIComponent(post.id)}`;
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(post.title);
  return html`
    <div class="share" aria-label="แชร์บันทึกนี้">
      <span class="share__label">แชร์</span>
      ${navigator.share ? raw(`<button type="button" class="chip" data-share-native>แชร์…</button>`) : ""}
      <a class="chip" href="https://social-plugins.line.me/lineit/share?url=${u}" target="_blank" rel="noopener noreferrer">LINE</a>
      <a class="chip" href="https://www.facebook.com/sharer/sharer.php?u=${u}" target="_blank" rel="noopener noreferrer">Facebook</a>
      <a class="chip" href="https://x.com/intent/post?url=${u}&text=${t}" target="_blank" rel="noopener noreferrer">X</a>
      <button type="button" class="chip" data-copy-link="${url}">คัดลอกลิงก์</button>
    </div>`;
}

export function bindShare(root, post) {
  root.querySelector("[data-share-native]")?.addEventListener("click", () =>
    navigator.share({ title: post.title, text: post.excerpt, url: `${SITE.url}/#/p/${encodeURIComponent(post.id)}` }).catch(() => {})
  );
  root.querySelectorAll("[data-copy-link]").forEach((b) =>
    b.addEventListener("click", async () => {
      await navigator.clipboard.writeText(b.dataset.copyLink);
      toast("คัดลอกลิงก์แล้ว");
    })
  );
}

/** "Copy" buttons on code blocks rendered by the markdown parser. */
export function bindCodeCopy(root) {
  root.querySelectorAll("[data-copy]").forEach((b) =>
    b.addEventListener("click", async () => {
      await navigator.clipboard.writeText(b.nextElementSibling.textContent);
      b.textContent = "คัดลอกแล้ว";
      setTimeout(() => (b.textContent = "คัดลอก"), 1500);
    })
  );
}

export const loading = (label = "กำลังโหลด…") => `<p class="state" role="status">${label}</p>`;
