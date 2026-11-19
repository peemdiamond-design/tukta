import { html, raw, formatDate, setTitle, toast, slugify } from "../lib/dom.js";
import { renderMarkdown } from "../lib/markdown.js";
import { listAll, getPost, savePost, deletePost } from "../services/posts.js";
import { session } from "../services/auth.js";
import { navigate } from "../lib/router.js";

const STATUS_LABEL = { published: "เผยแพร่แล้ว", draft: "ฉบับร่าง" };

export async function dashboardView(el) {
  setTitle("จัดการบันทึก");
  el.innerHTML = `<p class="state">กำลังโหลด…</p>`;
  const posts = await listAll();

  el.innerHTML = html`
    <div class="dash-head">
      <h1>บันทึกทั้งหมด</h1>
      <a class="btn" href="#/admin/new">เขียนบันทึกใหม่</a>
    </div>
    ${posts.length ? raw(html`
    <table class="dash-table">
      <thead><tr><th>ชื่อเรื่อง</th><th>สถานะ</th><th class="col-date">แก้ไขล่าสุด</th><th><span class="visually-hidden">การกระทำ</span></th></tr></thead>
      <tbody>
        ${posts.map((p) => raw(html`
          <tr>
            <td><a href="#/p/${encodeURIComponent(p.id)}">${p.title}</a></td>
            <td><span class="status status--${p.status}">${STATUS_LABEL[p.status] ?? p.status}</span></td>
            <td class="col-date">${formatDate(p.updatedAt, { dateStyle: "medium" })}</td>
            <td>
              <a class="btn btn--ghost" href="#/admin/edit/${encodeURIComponent(p.id)}">แก้ไข</a>
              <button class="btn btn--danger" data-delete="${p.id}" data-title="${p.title}">ลบ</button>
            </td>
          </tr>`))}
      </tbody>
    </table>`) : raw(`<p class="state">ยังไม่มีบันทึก เริ่มเขียนเรื่องแรกได้เลย</p>`)}
  `;

  el.querySelectorAll("[data-delete]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!confirm(`ลบ "${btn.dataset.title}" ถาวร? การลบนี้ย้อนกลับไม่ได้`)) return;
      btn.disabled = true;
      try {
        await deletePost(btn.dataset.delete);
        toast("ลบบันทึกแล้ว");
        dashboardView(el);
      } catch {
        toast("ลบไม่สำเร็จ ตรวจสอบสิทธิ์ผู้ดูแลแล้วลองใหม่", { error: true });
        btn.disabled = false;
      }
    })
  );
}

export async function editorView(el, { id } = {}) {
  const existing = id ? await getPost(id) : null;
  if (id && !existing) return navigate("/admin");
  setTitle(existing ? `แก้ไข: ${existing.title}` : "เขียนบันทึกใหม่");

  const p = existing ?? { title: "", content: "", tags: [], coverUrl: "", status: "draft" };
  el.innerHTML = html`
    <div class="dash-head"><h1>${existing ? "แก้ไขบันทึก" : "เขียนบันทึกใหม่"}</h1></div>
    <form class="form" id="post-form" novalidate>
      <div class="field">
        <label for="f-title">ชื่อเรื่อง</label>
        <input id="f-title" name="title" required maxlength="160" value="${p.title}">
      </div>
      <div class="form__row">
        <div class="field">
          <label for="f-slug">ลิงก์ของบันทึก</label>
          <input id="f-slug" name="slug" value="${existing?.id ?? ""}" ${existing ? "readonly" : ""}>
          <small>${existing ? "ลิงก์เปลี่ยนไม่ได้หลังสร้างแล้ว" : "เว้นว่างไว้เพื่อสร้างจากชื่อเรื่อง"}</small>
        </div>
        <div class="field">
          <label for="f-tags">แท็ก</label>
          <input id="f-tags" name="tags" value="${p.tags.join(", ")}">
          <small>คั่นด้วยเครื่องหมายจุลภาค</small>
        </div>
      </div>
      <div class="field">
        <label for="f-cover">รูปปก (URL)</label>
        <input id="f-cover" name="coverUrl" type="url" value="${p.coverUrl}" placeholder="https://">
      </div>
      <div class="field">
        <div class="editor-tabs" role="tablist">
          <button type="button" role="tab" aria-selected="true" data-tab="write">เขียน</button>
          <button type="button" role="tab" aria-selected="false" data-tab="preview">ดูตัวอย่าง</button>
        </div>
        <label for="f-content" class="visually-hidden">เนื้อหา</label>
        <textarea id="f-content" name="content" required>${p.content}</textarea>
        <div class="preview-pane prose" hidden></div>
        <small>รองรับ Markdown: # หัวข้อ, **ตัวหนา**, *ตัวเอียง*, [ลิงก์](https://), ![รูป](https://), &gt; คำพูด, - รายการ</small>
      </div>
      <div class="form__actions">
        <button class="btn" type="submit" data-status="published">เผยแพร่</button>
        <button class="btn btn--ghost" type="submit" data-status="draft">บันทึกฉบับร่าง</button>
        <a class="btn btn--ghost" href="#/admin">ยกเลิก</a>
      </div>
    </form>`;

  const form = el.querySelector("#post-form");
  const textarea = form.querySelector("#f-content");
  const preview = form.querySelector(".preview-pane");
  const titleInput = form.querySelector("#f-title");
  const slugInput = form.querySelector("#f-slug");

  form.querySelectorAll("[data-tab]").forEach((tab) =>
    tab.addEventListener("click", () => {
      const isPreview = tab.dataset.tab === "preview";
      form.querySelectorAll("[data-tab]").forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
      textarea.hidden = isPreview;
      preview.hidden = !isPreview;
      if (isPreview) preview.innerHTML = renderMarkdown(textarea.value) || `<p class="state">ยังไม่มีเนื้อหา</p>`;
    })
  );

  let dirty = false;
  form.addEventListener("input", () => (dirty = true));
  const guard = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
  window.addEventListener("beforeunload", guard);
  window.addEventListener("hashchange", () => window.removeEventListener("beforeunload", guard), { once: true });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = e.submitter?.dataset.status ?? "draft";
    const title = titleInput.value.trim();
    const content = textarea.value;
    const slug = existing?.id ?? (slugify(slugInput.value) || slugify(title));

    if (!title) return toast("ใส่ชื่อเรื่องก่อนบันทึก", { error: true }), titleInput.focus();
    if (!content.trim()) return toast("ใส่เนื้อหาก่อนบันทึก", { error: true }), textarea.focus();
    if (!slug) return toast("ลิงก์ใช้ได้เฉพาะตัวอักษร ตัวเลข และขีด", { error: true }), slugInput.focus();

    if (!existing && (await getPost(slug).catch(() => null))) {
      return toast("มีบันทึกที่ใช้ลิงก์นี้แล้ว เปลี่ยนลิงก์ก่อนบันทึก", { error: true }), slugInput.focus();
    }

    const buttons = form.querySelectorAll("button[type=submit]");
    buttons.forEach((b) => (b.disabled = true));
    try {
      await savePost(
        {
          id: slug,
          title,
          content,
          tags: form.tags.value.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10),
          coverUrl: form.coverUrl.value,
          status,
        },
        existing,
        session.user.uid
      );
      dirty = false;
      toast(status === "published" ? "เผยแพร่แล้ว" : "บันทึกฉบับร่างแล้ว");
      navigate(status === "published" ? `/p/${encodeURIComponent(slug)}` : "/admin");
    } catch (err) {
      console.error(err);
      toast("บันทึกไม่สำเร็จ ตรวจสอบการเชื่อมต่อแล้วลองใหม่", { error: true });
      buttons.forEach((b) => (b.disabled = false));
    }
  });
}
