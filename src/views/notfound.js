import { setMeta } from "../lib/seo.js";

export function notFoundView(el) {
  setMeta({ title: "ไม่พบหน้านี้" });
  el.innerHTML = `
    <section class="lead-entry">
      <h1>ไม่พบหน้านี้</h1>
      <p class="lead-entry__excerpt">หน้านี้อาจถูกย้ายหรือยังไม่ได้เผยแพร่ ลองค้นหาหรือกลับไปที่สารบัญ</p>
      <p class="form__actions"><a class="btn" href="#/search">ค้นหาบันทึก</a> <a class="btn btn--ghost" href="#/">กลับไปที่สารบัญ</a></p>
    </section>`;
}
