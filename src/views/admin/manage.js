// Comment moderation, newsletter subscribers and site settings.
import { html, raw, formatDate, timeAgo, toast, postHref } from "../../lib/dom.js";
import { setMeta } from "../../lib/seo.js";
import { listAllComments, deleteComment } from "../../services/engagement.js";
import { listAll } from "../../services/posts.js";
import { listSubscribers, deleteSubscriber, getSettings, saveSettings, uploadImage, resolveImage } from "../../services/site.js";
import { session } from "../../services/auth.js";
import { loading } from "../components.js";
import { adminNav } from "./shared.js";

export async function commentsAdminView(el) {
  setMeta({ title: "ความคิดเห็น" });
  el.innerHTML = adminNav("/admin/comments") + loading();
  const [comments, posts] = await Promise.all([listAllComments(), listAll()]);
  const titles = Object.fromEntries(posts.map((p) => [p.id, p.title]));

  const render = () => {
    el.innerHTML = html`
      ${raw(adminNav("/admin/comments"))}
      <div class="dash-head"><h1>ความคิดเห็น</h1><span class="listing__count">${comments.length} รายการ</span></div>
      ${comments.length ? raw(html`
        <ol class="comment-list comment-list--admin">
          ${comments.map((c) => raw(html`
            <li class="comment">
              <div>
                <p class="comment__head"><strong>${c.name}</strong> <time>${timeAgo(c.createdAt)}</time>
                  ใน <a href="${postHref(c.postId)}">${titles[c.postId] || c.postId}</a></p>
                <p class="comment__body">${c.body}</p>
                <button type="button" class="btn btn--danger btn--sm" data-del="${c.id}">ลบ</button>
              </div>
            </li>`))}
        </ol>`) : raw(`<p class="state">ยังไม่มีความคิดเห็น</p>`)}`;
    el.querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("ลบความคิดเห็นนี้ถาวร?")) return;
        b.disabled = true;
        try {
          await deleteComment(b.dataset.del);
          comments.splice(comments.findIndex((c) => c.id === b.dataset.del), 1);
          toast("ลบความคิดเห็นแล้ว");
          render();
        } catch {
          toast("ลบไม่สำเร็จ", { error: true });
          b.disabled = false;
        }
      })
    );
  };
  render();
}

export async function subscribersView(el) {
  setMeta({ title: "ผู้ติดตาม" });
  el.innerHTML = adminNav("/admin/subscribers") + loading();
  const subs = await listSubscribers();

  const render = () => {
    el.innerHTML = html`
      ${raw(adminNav("/admin/subscribers"))}
      <div class="dash-head">
        <h1>ผู้ติดตามทางอีเมล</h1>
        <div class="form__actions">
          <button class="btn btn--ghost" data-copy ${subs.length ? "" : raw("disabled")}>คัดลอกอีเมลทั้งหมด</button>
          <button class="btn" data-csv ${subs.length ? "" : raw("disabled")}>ดาวน์โหลด CSV</button>
        </div>
      </div>
      <p class="hint">ใช้รายชื่อนี้ส่งอีเมลแจ้งบันทึกใหม่ผ่านบริการส่งอีเมลที่คุณใช้ (เช่น Gmail BCC หรือ Mailchimp)</p>
      ${subs.length ? raw(html`
        <div class="table-wrap"><table class="dash-table">
          <thead><tr><th>อีเมล</th><th class="col-date">สมัครเมื่อ</th><th><span class="visually-hidden">การกระทำ</span></th></tr></thead>
          <tbody>${subs.map((s) => raw(html`
            <tr><td>${s.email}</td><td class="col-date">${formatDate(s.createdAt, { dateStyle: "medium" })}</td>
            <td class="row-actions"><button class="btn btn--danger btn--sm" data-del="${s.id}">ลบ</button></td></tr>`))}
          </tbody></table></div>`) : raw(`<p class="state">ยังไม่มีผู้ติดตาม กล่องสมัครรับข่าวอยู่ท้ายทุกบันทึกและหน้าแรก</p>`)}`;

    el.querySelector("[data-copy]")?.addEventListener("click", async () => {
      await navigator.clipboard.writeText(subs.map((s) => s.email).join(", "));
      toast("คัดลอกอีเมลแล้ว");
    });
    el.querySelector("[data-csv]")?.addEventListener("click", () => {
      const csv = "email,subscribed_at\n" + subs.map((s) => `${s.email},${s.createdAt?.toDate?.().toISOString() ?? ""}`).join("\n");
      const a = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
        download: `subscribers-${new Date().toISOString().slice(0, 10)}.csv`,
      });
      a.click();
      URL.revokeObjectURL(a.href);
    });
    el.querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm(`ลบ ${b.dataset.del} ออกจากรายชื่อ?`)) return;
        try {
          await deleteSubscriber(b.dataset.del);
          subs.splice(subs.findIndex((s) => s.id === b.dataset.del), 1);
          toast("ลบแล้ว");
          render();
        } catch {
          toast("ลบไม่สำเร็จ", { error: true });
        }
      })
    );
  };
  render();
}

export async function settingsView(el) {
  setMeta({ title: "ตั้งค่าเว็บ" });
  el.innerHTML = adminNav("/admin/settings") + loading();
  const s = await getSettings();

  el.innerHTML = html`
    ${raw(adminNav("/admin/settings"))}
    <div class="dash-head"><h1>ตั้งค่าเว็บ</h1></div>
    <form class="form" id="settings" novalidate>
      <div class="form__row">
        <div class="field"><label for="s-name">ชื่อบล็อก</label><input id="s-name" name="name" maxlength="40" value="${s.name}" required></div>
        <div class="field"><label for="s-tagline">คำโปรย</label><input id="s-tagline" name="tagline" maxlength="80" value="${s.tagline}"></div>
      </div>
      <div class="field">
        <label for="s-desc">คำอธิบายเว็บ</label>
        <input id="s-desc" name="description" maxlength="200" value="${s.description}">
        <small>แสดงในผลค้นหา Google และตอนแชร์ลิงก์</small>
      </div>
      <div class="field">
        <label for="s-avatar">รูปโปรไฟล์</label>
        <div class="cover-field">
          <input id="s-avatar" name="avatarUrl" value="${s.avatarUrl}" placeholder="https:// หรืออัปโหลด">
          <button type="button" class="btn btn--ghost" data-avatar-upload>อัปโหลด</button>
        </div>
        <img class="about__avatar" data-avatar-preview alt="" hidden>
      </div>
      <div class="field">
        <label for="s-about">เกี่ยวกับฉัน</label>
        <textarea id="s-about" name="about" class="textarea--short">${s.about}</textarea>
        <small>รองรับ Markdown เหมือนตอนเขียนบันทึก</small>
      </div>
      <fieldset class="fieldset">
        <legend>ช่องทางติดต่อ</legend>
        <div class="form__row">
          <div class="field"><label for="s-fb">Facebook</label><input id="s-fb" name="facebook" value="${s.socials.facebook}" placeholder="ชื่อเพจ หรือ https://"></div>
          <div class="field"><label for="s-ig">Instagram</label><input id="s-ig" name="instagram" value="${s.socials.instagram}" placeholder="@username"></div>
          <div class="field"><label for="s-x">X</label><input id="s-x" name="x" value="${s.socials.x}" placeholder="@username"></div>
          <div class="field"><label for="s-line">LINE ID</label><input id="s-line" name="line" value="${s.socials.line}" placeholder="@lineid"></div>
          <div class="field"><label for="s-email">อีเมล</label><input id="s-email" name="email" type="email" value="${s.socials.email}"></div>
        </div>
      </fieldset>
      <div class="form__actions"><button class="btn" type="submit">บันทึกการตั้งค่า</button></div>
      <input type="file" accept="image/*" data-file hidden>
    </form>`;

  const form = el.querySelector("#settings");
  const preview = form.querySelector("[data-avatar-preview]");
  const paint = async () => {
    const src = await resolveImage(form.avatarUrl.value.trim()).catch(() => "");
    preview.hidden = !src;
    if (src) preview.src = src;
  };
  paint();
  form.avatarUrl.addEventListener("change", paint);
  const file = form.querySelector("[data-file]");
  form.querySelector("[data-avatar-upload]").addEventListener("click", () => file.click());
  file.addEventListener("change", async () => {
    if (!file.files[0]) return;
    try {
      form.avatarUrl.value = await uploadImage(file.files[0], session.user.uid);
      paint();
      toast("อัปโหลดรูปแล้ว");
    } catch (err) {
      toast(err.message || "อัปโหลดไม่สำเร็จ", { error: true });
    }
    file.value = "";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = form.elements;
    if (!f.name.value.trim()) return toast("ใส่ชื่อบล็อกก่อนบันทึก", { error: true }), f.name.focus();
    const btn = form.querySelector("[type=submit]");
    btn.disabled = true;
    try {
      await saveSettings({
        name: f.name.value.trim(),
        tagline: f.tagline.value.trim(),
        description: f.description.value.trim(),
        avatarUrl: f.avatarUrl.value.trim(),
        about: f.about.value,
        socials: { facebook: f.facebook.value.trim(), instagram: f.instagram.value.trim(), x: f.x.value.trim(), line: f.line.value.trim(), email: f.email.value.trim() },
      });
      toast("บันทึกการตั้งค่าแล้ว");
      document.dispatchEvent(new CustomEvent("settings-changed"));
    } catch (err) {
      console.error(err);
      toast("บันทึกไม่สำเร็จ", { error: true });
    }
    btn.disabled = false;
  });
}
