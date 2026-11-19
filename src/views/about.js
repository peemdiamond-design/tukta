import { setTitle } from "../lib/dom.js";

export function aboutView(el) {
  setTitle("เกี่ยวกับ");
  el.innerHTML = `
    <article class="article">
      <h1>เกี่ยวกับสมุดเล่มนี้</h1>
      <div class="prose">
        <p>สวัสดี ฉันชื่อตุ๊กตา ที่นี่คือสมุดบันทึกออนไลน์ที่ฉันใช้จดเรื่องเล็ก ๆ ในแต่ละวัน
        ทั้งหนังสือที่อ่าน ร้านกาแฟที่ชอบ และความคิดที่อยากเก็บไว้</p>
        <p>ทุกบันทึกเขียนเอง ไม่มีโฆษณา อ่านได้ตามสบาย</p>
      </div>
    </article>`;
}
