import { setTitle } from "../lib/dom.js";

export function notFoundView(el) {
  setTitle("ไม่พบหน้านี้");
  el.innerHTML = `
    <section class="lead-entry">
      <h1>ไม่พบหน้านี้</h1>
      <p class="lead-entry__excerpt">หน้านี้อาจถูกย้ายหรือยังไม่ได้เผยแพร่</p>
      <a class="btn btn--ghost" href="#/">กลับไปที่สารบัญ</a>
    </section>`;
}
