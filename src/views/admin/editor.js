import { html, raw, toast, slugify, debounce, readingMinutes } from "../../lib/dom.js";
import { setMeta } from "../../lib/seo.js";
import { parseMarkdown, plainText } from "../../lib/markdown.js";
import { getPostFresh, savePost } from "../../services/posts.js";
import { uploadImage, hydrateImages, resolveImage } from "../../services/site.js";
import { session } from "../../services/auth.js";
import { navigate } from "../../lib/router.js";
import { adminNav, editorState } from "./shared.js";

const TOOLS = [
  ["bold", "ตัวหนา", "B", "Ctrl+B"],
  ["italic", "ตัวเอียง", "I", "Ctrl+I"],
  ["h2", "หัวข้อ", "H", ""],
  ["link", "ลิงก์", "🔗", "Ctrl+K"],
  ["quote", "คำพูด", "❝", ""],
  ["ul", "รายการ", "•", ""],
  ["ol", "รายการลำดับ", "1.", ""],
  ["code", "โค้ด", "</>", ""],
  ["table", "ตาราง", "▦", ""],
  ["hr", "เส้นคั่น", "—", ""],
  ["image", "แทรกรูป", "🖼", ""],
];

const draftKey = (id) => `tukta-draft:${id || "new"}`;

export async function editorView(el, { id } = {}) {
  const existing = id ? await getPostFresh(id) : null;
  if (id && !existing) return navigate("/admin", { replace: true });
  setMeta({ title: existing ? `แก้ไข: ${existing.title}` : "เขียนบันทึกใหม่" });

  let p = existing ?? { title: "", content: "", tags: [], coverUrl: "", status: "draft", featured: false };

  // Offer to restore a newer local autosave.
  const local = JSON.parse(localStorage.getItem(draftKey(id)) || "null");
  const savedAt = existing?.updatedAt?.toMillis?.() ?? 0;
  if (local && local.savedAt > savedAt && (local.title !== p.title || local.content !== p.content)) {
    if (confirm("พบฉบับที่บันทึกอัตโนมัติในเครื่องซึ่งใหม่กว่า ต้องการกู้คืนไหม?")) p = { ...p, ...local };
    else localStorage.removeItem(draftKey(id));
  }

  el.innerHTML = html`
    ${raw(adminNav(existing ? "" : "/admin/new"))}
    <div class="dash-head">
      <h1>${existing ? "แก้ไขบันทึก" : "เขียนบันทึกใหม่"}</h1>
      <span class="autosave" data-autosave aria-live="polite"></span>
    </div>
    <form class="form editor" id="post-form" novalidate>
      <div class="field">
        <label for="f-title">ชื่อเรื่อง</label>
        <input id="f-title" name="title" required maxlength="160" value="${p.title}" autocomplete="off">
      </div>
      <div class="form__row">
        <div class="field">
          <label for="f-slug">ลิงก์ของบันทึก</label>
          <input id="f-slug" name="slug" value="${existing?.id ?? ""}" ${existing ? raw("readonly") : ""} placeholder="สร้างจากชื่อเรื่องอัตโนมัติ">
          <small data-slug-hint>${existing ? "ลิงก์เปลี่ยนไม่ได้หลังสร้างแล้ว" : ""}</small>
        </div>
        <div class="field">
          <label for="f-tags">แท็ก</label>
          <input id="f-tags" name="tags" value="${(p.tags || []).join(", ")}" placeholder="กาแฟ, หนังสือ">
          <small>คั่นด้วยเครื่องหมายจุลภาค สูงสุด 10 แท็ก</small>
        </div>
      </div>

      <div class="field">
        <label for="f-cover">รูปปก</label>
        <div class="cover-field">
          <input id="f-cover" name="coverUrl" value="${p.coverUrl}" placeholder="วางลิงก์รูป https:// หรืออัปโหลด">
          <button type="button" class="btn btn--ghost" data-cover-upload>อัปโหลด</button>
          <button type="button" class="btn btn--ghost" data-cover-clear>ลบรูปปก</button>
        </div>
        <img class="cover-preview" data-cover-preview alt="" hidden>
      </div>

      <div class="field">
        <div class="editor-bar">
          <div class="toolbar" role="toolbar" aria-label="จัดรูปแบบ">
            ${TOOLS.map(([cmd, label, icon, key]) => raw(html`<button type="button" data-cmd="${cmd}" title="${label}${key ? ` (${key})` : ""}" aria-label="${label}">${icon}</button>`))}
          </div>
          <div class="editor-tabs" role="tablist">
            <button type="button" role="tab" aria-selected="true" data-tab="write">เขียน</button>
            <button type="button" role="tab" aria-selected="false" data-tab="preview">ดูตัวอย่าง</button>
          </div>
        </div>
        <label for="f-content" class="visually-hidden">เนื้อหา</label>
        <textarea id="f-content" name="content" required placeholder="เริ่มเขียนได้เลย… ลากรูปมาวางที่นี่เพื่ออัปโหลด">${p.content}</textarea>
        <div class="preview-pane prose" hidden></div>
        <p class="editor-meta"><span data-count></span></p>
      </div>

      <label class="check"><input type="checkbox" name="featured" ${p.featured ? raw("checked") : ""}> ปักหมุดไว้ด้านบนหน้าแรก</label>

      <div class="form__actions form__actions--sticky">
        <button class="btn" type="submit" data-status="published">${existing?.status === "published" ? "อัปเดตบันทึก" : "เผยแพร่"}</button>
        <button class="btn btn--ghost" type="submit" data-status="draft">${existing?.status === "published" ? "ย้ายกลับเป็นฉบับร่าง" : "บันทึกฉบับร่าง"}</button>
        <a class="btn btn--ghost" href="#/admin">ยกเลิก</a>
        <small class="kbd-hint">Ctrl/⌘ + S บันทึกฉบับร่าง</small>
      </div>
      <input type="file" accept="image/*" data-file hidden>
    </form>`;

  const form = el.querySelector("#post-form");
  const ta = form.content;
  const preview = form.querySelector(".preview-pane");
  const fileInput = form.querySelector("[data-file]");
  const coverPreview = form.querySelector("[data-cover-preview]");
  const autosaveEl = el.querySelector("[data-autosave]");
  let fileTarget = "content";
  editorState.dirty = false;

  /* ---------- live stats + autosave ---------- */
  const updateCount = () => {
    const text = plainText(ta.value);
    form.querySelector("[data-count]").textContent = `${text.length.toLocaleString("th-TH")} ตัวอักษร · อ่านประมาณ ${readingMinutes(text)} นาที`;
  };
  const autosave = debounce(() => {
    localStorage.setItem(draftKey(id), JSON.stringify({
      title: form.title.value, content: ta.value, tags: splitTags(form.tags.value),
      coverUrl: form.coverUrl.value, featured: form.featured.checked, savedAt: Date.now(),
    }));
    autosaveEl.textContent = `บันทึกในเครื่องแล้ว ${new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`;
  }, 800);
  form.addEventListener("input", () => { editorState.dirty = true; updateCount(); autosave(); });
  updateCount();

  if (!existing) {
    const hint = form.querySelector("[data-slug-hint]");
    const showSlug = () => (hint.textContent = `ลิงก์: #/p/${slugify(form.slug.value) || slugify(form.title.value) || "…"}`);
    form.title.addEventListener("input", showSlug);
    form.slug.addEventListener("input", showSlug);
  }

  /* ---------- cover ---------- */
  const paintCover = async () => {
    const src = await resolveImage(form.coverUrl.value.trim()).catch(() => "");
    coverPreview.hidden = !src;
    if (src) coverPreview.src = src;
  };
  form.coverUrl.addEventListener("change", paintCover);
  form.querySelector("[data-cover-upload]").addEventListener("click", () => { fileTarget = "cover"; fileInput.click(); });
  form.querySelector("[data-cover-clear]").addEventListener("click", () => { form.coverUrl.value = ""; paintCover(); editorState.dirty = true; autosave(); });
  paintCover();

  /* ---------- toolbar ---------- */
  const wrap = (before, after = before, placeholder = "ข้อความ") => {
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const sel = value.slice(s, e) || placeholder;
    ta.setRangeText(before + sel + after, s, e, "end");
    ta.setSelectionRange(s + before.length, s + before.length + sel.length);
    ta.focus();
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const prefixLines = (prefix) => {
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const start = value.lastIndexOf("\n", s - 1) + 1;
    const block = value.slice(start, e) || "ข้อความ";
    const out = block.split("\n").map((l, i) => (typeof prefix === "function" ? prefix(i) : prefix) + l).join("\n");
    ta.setRangeText(out, start, e, "end");
    ta.focus();
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const insertBlock = (text) => {
    const pos = ta.selectionEnd;
    const pre = ta.value.slice(0, pos).endsWith("\n\n") || pos === 0 ? "" : "\n\n";
    ta.setRangeText(`${pre}${text}\n\n`, pos, pos, "end");
    ta.focus();
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const commands = {
    bold: () => wrap("**"),
    italic: () => wrap("*"),
    h2: () => prefixLines("## "),
    link: () => {
      const url = prompt("ใส่ลิงก์ (https://...)", "https://");
      if (url && /^https?:\/\//.test(url)) wrap("[", `](${url})`, "ข้อความลิงก์");
    },
    quote: () => prefixLines("> "),
    ul: () => prefixLines("- "),
    ol: () => prefixLines((i) => `${i + 1}. `),
    code: () => (ta.value.slice(ta.selectionStart, ta.selectionEnd).includes("\n") ? wrap("```\n", "\n```", "โค้ด") : wrap("`")),
    table: () => insertBlock("| หัวข้อ | หัวข้อ |\n| --- | --- |\n| ข้อมูล | ข้อมูล |"),
    hr: () => insertBlock("---"),
    image: () => { fileTarget = "content"; fileInput.click(); },
  };
  form.querySelectorAll("[data-cmd]").forEach((b) => b.addEventListener("click", () => commands[b.dataset.cmd]()));
  ta.addEventListener("keydown", (e) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    const k = e.key.toLowerCase();
    if (k === "b") { e.preventDefault(); commands.bold(); }
    if (k === "i") { e.preventDefault(); commands.italic(); }
    if (k === "k") { e.preventDefault(); commands.link(); }
  });

  /* ---------- image upload (button, drop, paste) ---------- */
  const handleFile = async (file) => {
    if (!file) return;
    const target = fileTarget;
    fileTarget = "content";
    toast("กำลังอัปโหลดรูป…");
    try {
      const ref = await uploadImage(file, session.user.uid);
      if (target === "cover") {
        form.coverUrl.value = ref;
        paintCover();
      } else {
        const alt = file.name.replace(/\.[^.]+$/, "").replace(/[[\]]/g, "");
        insertBlock(`![${alt}](${ref})`);
      }
      editorState.dirty = true;
      autosave();
      toast("อัปโหลดรูปแล้ว");
    } catch (err) {
      toast(err.message?.startsWith("รูป") || err.message?.startsWith("ไฟล์") || err.message?.startsWith("อ่าน") ? err.message : "อัปโหลดรูปไม่สำเร็จ", { error: true });
    }
  };
  fileInput.addEventListener("change", () => { handleFile(fileInput.files[0]); fileInput.value = ""; });
  ta.addEventListener("dragover", (e) => { e.preventDefault(); ta.classList.add("is-drop"); });
  ta.addEventListener("dragleave", () => ta.classList.remove("is-drop"));
  ta.addEventListener("drop", (e) => {
    ta.classList.remove("is-drop");
    const file = [...(e.dataTransfer?.files || [])].find((f) => f.type.startsWith("image/"));
    if (file) { e.preventDefault(); handleFile(file); }
  });
  ta.addEventListener("paste", (e) => {
    const file = [...(e.clipboardData?.files || [])].find((f) => f.type.startsWith("image/"));
    if (file) { e.preventDefault(); handleFile(file); }
  });

  /* ---------- preview ---------- */
  form.querySelectorAll("[data-tab]").forEach((tab) =>
    tab.addEventListener("click", () => {
      const isPreview = tab.dataset.tab === "preview";
      form.querySelectorAll("[data-tab]").forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
      ta.hidden = isPreview;
      preview.hidden = !isPreview;
      form.querySelector(".toolbar").toggleAttribute("hidden", isPreview);
      if (isPreview) {
        preview.innerHTML = parseMarkdown(ta.value).html || `<p class="state">ยังไม่มีเนื้อหา</p>`;
        hydrateImages(preview);
      }
    })
  );

  /* ---------- save ---------- */
  const save = async (status) => {
    const title = form.title.value.trim();
    const content = ta.value;
    const slug = existing?.id ?? (slugify(form.slug.value) || slugify(title));

    if (!title) return toast("ใส่ชื่อเรื่องก่อนบันทึก", { error: true }), form.title.focus();
    if (status === "published" && !content.trim()) return toast("ใส่เนื้อหาก่อนเผยแพร่", { error: true }), ta.focus();
    if (!slug) return toast("ลิงก์ใช้ได้เฉพาะตัวอักษร ตัวเลข และขีด", { error: true }), form.slug.focus();
    if (!existing && (await getPostFresh(slug).catch(() => null))) {
      return toast("มีบันทึกที่ใช้ลิงก์นี้แล้ว เปลี่ยนลิงก์ก่อนบันทึก", { error: true }), form.slug.focus();
    }

    const buttons = form.querySelectorAll("button[type=submit]");
    buttons.forEach((b) => (b.disabled = true));
    try {
      await savePost(
        { id: slug, title, content, tags: splitTags(form.tags.value), coverUrl: form.coverUrl.value, status, featured: form.featured.checked },
        existing,
        session.user.uid
      );
      editorState.dirty = false;
      localStorage.removeItem(draftKey(id));
      toast(status === "published" ? "เผยแพร่แล้ว" : "บันทึกฉบับร่างแล้ว");
      navigate(status === "published" ? `/p/${encodeURIComponent(slug)}` : `/admin/edit/${encodeURIComponent(slug)}`, { replace: !existing });
    } catch (err) {
      console.error(err);
      toast("บันทึกไม่สำเร็จ ตรวจสอบการเชื่อมต่อแล้วลองใหม่", { error: true });
      buttons.forEach((b) => (b.disabled = false));
    }
  };
  form.addEventListener("submit", (e) => { e.preventDefault(); save(e.submitter?.dataset.status ?? "draft"); });
  const onKey = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s" && document.body.contains(form)) {
      e.preventDefault();
      save(existing?.status === "published" ? "published" : "draft");
    }
  };
  document.addEventListener("keydown", onKey);
  addEventListener("hashchange", () => document.removeEventListener("keydown", onKey), { once: true });
}

const splitTags = (v) => [...new Set(v.split(",").map((t) => t.trim()).filter(Boolean))].slice(0, 10).map((t) => t.slice(0, 40));
