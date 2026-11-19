import { html, raw, formatDate, formatNumber, toast, postHref } from "../../lib/dom.js";
import { setMeta } from "../../lib/seo.js";
import { listAll, deletePost } from "../../services/posts.js";
import { listStats } from "../../services/engagement.js";
import { countOf } from "../../services/site.js";
import { loading } from "../components.js";
import { adminNav } from "./shared.js";

const STATUS_LABEL = { published: "เผยแพร่แล้ว", draft: "ฉบับร่าง" };

export async function dashboardView(el) {
  setMeta({ title: "ภาพรวม" });
  el.innerHTML = adminNav("/admin") + loading();

  const [posts, views, comments, likes, subscribers] = await Promise.all([
    listAll(),
    listStats().catch(() => ({})),
    countOf("comments").catch(() => 0),
    countOf("likes").catch(() => 0),
    countOf("subscribers").catch(() => 0),
  ]);
  const published = posts.filter((p) => p.status === "published");
  const totalViews = Object.values(views).reduce((a, b) => a + b, 0);
  const top = [...published].sort((a, b) => (views[b.id] || 0) - (views[a.id] || 0)).slice(0, 5);

  let filter = "all";
  let term = "";

  el.innerHTML = html`
    ${raw(adminNav("/admin"))}
    <div class="dash-head">
      <h1>ภาพรวม</h1>
      <a class="btn" href="#/admin/new">เขียนบันทึกใหม่</a>
    </div>

    <dl class="stats">
      <div><dt>เผยแพร่แล้ว</dt><dd>${published.length}</dd></div>
      <div><dt>ฉบับร่าง</dt><dd>${posts.length - published.length}</dd></div>
      <div><dt>การอ่านทั้งหมด</dt><dd>${formatNumber(totalViews)}</dd></div>
      <div><dt>ถูกใจ</dt><dd>${formatNumber(likes)}</dd></div>
      <div><dt>ความคิดเห็น</dt><dd>${formatNumber(comments)}</dd></div>
      <div><dt>ผู้ติดตามทางอีเมล</dt><dd>${formatNumber(subscribers)}</dd></div>
    </dl>

    ${top.length ? raw(html`
      <section class="top-posts">
        <h2>อ่านมากที่สุด</h2>
        <ol>${top.map((p) => raw(html`<li><a href="${postHref(p.id)}">${p.title}</a> <small>${formatNumber(views[p.id] || 0)} ครั้ง</small></li>`))}</ol>
      </section>`) : ""}

    <section>
      <div class="dash-tools">
        <h2>บันทึกทั้งหมด</h2>
        <div class="segmented" role="group" aria-label="กรองตามสถานะ">
          <button type="button" data-filter="all" aria-pressed="true">ทั้งหมด</button>
          <button type="button" data-filter="published" aria-pressed="false">เผยแพร่แล้ว</button>
          <button type="button" data-filter="draft" aria-pressed="false">ฉบับร่าง</button>
        </div>
        <label class="visually-hidden" for="dash-q">ค้นหาบันทึก</label>
        <input id="dash-q" type="search" placeholder="ค้นหาชื่อเรื่อง" class="input">
      </div>
      <div class="table-wrap"><table class="dash-table">
        <thead><tr><th>ชื่อเรื่อง</th><th>สถานะ</th><th class="col-num">อ่าน</th><th class="col-date">แก้ไขล่าสุด</th><th><span class="visually-hidden">การกระทำ</span></th></tr></thead>
        <tbody data-rows></tbody>
      </table></div>
    </section>`;

  const rows = el.querySelector("[data-rows]");
  const renderRows = () => {
    const list = posts
      .filter((p) => filter === "all" || p.status === filter)
      .filter((p) => !term || p.title.toLowerCase().includes(term));
    rows.innerHTML = list.length
      ? list.map((p) => html`
          <tr>
            <td>${p.featured ? raw(`<span class="pin" title="ปักหมุด">ปักหมุด</span> `) : ""}<a href="${postHref(p.id)}">${p.title}</a></td>
            <td><span class="status status--${p.status}">${STATUS_LABEL[p.status] ?? p.status}</span></td>
            <td class="col-num">${formatNumber(views[p.id] || 0)}</td>
            <td class="col-date">${formatDate(p.updatedAt, { dateStyle: "medium" })}</td>
            <td class="row-actions">
              <a class="btn btn--ghost btn--sm" href="#/admin/edit/${encodeURIComponent(p.id)}">แก้ไข</a>
              <button class="btn btn--danger btn--sm" data-delete="${p.id}" data-title="${p.title}">ลบ</button>
            </td>
          </tr>`).join("")
      : `<tr><td colspan="5" class="state">${posts.length ? "ไม่มีบันทึกที่ตรงกับตัวกรอง" : "ยังไม่มีบันทึก เริ่มเขียนเรื่องแรกได้เลย"}</td></tr>`;

    rows.querySelectorAll("[data-delete]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        if (!confirm(`ลบ "${btn.dataset.title}" ถาวร?\nความคิดเห็น ยอดถูกใจ และยอดอ่านของบันทึกนี้จะถูกลบด้วย การลบนี้ย้อนกลับไม่ได้`)) return;
        btn.disabled = true;
        try {
          await deletePost(btn.dataset.delete);
          toast("ลบบันทึกแล้ว");
          dashboardView(el);
        } catch (err) {
          console.error(err);
          toast("ลบไม่สำเร็จ ตรวจสอบสิทธิ์ผู้ดูแลแล้วลองใหม่", { error: true });
          btn.disabled = false;
        }
      })
    );
  };

  el.querySelectorAll("[data-filter]").forEach((b) =>
    b.addEventListener("click", () => {
      filter = b.dataset.filter;
      el.querySelectorAll("[data-filter]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      renderRows();
    })
  );
  el.querySelector("#dash-q").addEventListener("input", (e) => { term = e.target.value.trim().toLowerCase(); renderRows(); });
  renderRows();
}
