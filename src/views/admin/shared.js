import { html, raw } from "../../lib/dom.js";

const TABS = [
  ["/admin", "ภาพรวม"],
  ["/admin/new", "เขียนบันทึก"],
  ["/admin/comments", "ความคิดเห็น"],
  ["/admin/subscribers", "ผู้ติดตาม"],
  ["/admin/settings", "ตั้งค่าเว็บ"],
];

export const adminNav = (active) => html`
  <nav class="admin-nav" aria-label="เมนูผู้ดูแล">
    ${TABS.map(([path, label]) => raw(html`<a href="#${path}" ${path === active ? raw('aria-current="page"') : ""}>${label}</a>`))}
  </nav>`;

/** Unsaved-changes flag consulted by the router guard in main.js. */
export const editorState = { dirty: false };
