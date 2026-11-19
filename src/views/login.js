import { html, toast } from "../lib/dom.js";
import { setMeta } from "../lib/seo.js";
import { session, signInWithGoogle, signOut } from "../services/auth.js";
import { navigate } from "../lib/router.js";

export function loginView(el) {
  setMeta({ title: "เข้าสู่ระบบ", path: "/login" });

  if (session.isAdmin) return navigate("/admin", { replace: true });

  if (session.isMember) {
    el.innerHTML = html`
      <section class="login">
        <h1>เข้าสู่ระบบแล้ว</h1>
        <p>คุณเข้าสู่ระบบเป็น <strong>${session.user.email}</strong> แสดงความคิดเห็นในบันทึกต่าง ๆ ได้เลย</p>
        <details class="login__admin">
          <summary>เป็นเจ้าของบล็อก?</summary>
          <p>บัญชีนี้ยังไม่มีสิทธิ์เขียน ให้สร้างเอกสาร <code>admins/${session.user.uid}</code> ใน Firestore แล้วรีเฟรชหน้านี้</p>
          <p><button type="button" class="link-btn" data-copy-uid>คัดลอก UID</button></p>
        </details>
        <p class="form__actions"><a class="btn" href="#/">ไปอ่านบันทึก</a> <button class="btn btn--ghost" id="out">ออกจากระบบ</button></p>
      </section>`;
    el.querySelector("#out").addEventListener("click", () => signOut());
    el.querySelector("[data-copy-uid]").addEventListener("click", async () => {
      await navigator.clipboard.writeText(session.user.uid);
      toast("คัดลอก UID แล้ว");
    });
    return;
  }

  el.innerHTML = `
    <section class="login">
      <h1>เข้าสู่ระบบ</h1>
      <p>เข้าสู่ระบบด้วย Google เพื่อแสดงความคิดเห็น ส่วนเจ้าของบล็อกใช้หน้านี้เข้าไปเขียนบันทึก</p>
      <button class="btn" id="google">เข้าสู่ระบบด้วย Google</button>
      <p class="login__note">เราใช้แค่ชื่อและรูปโปรไฟล์ของคุณเพื่อแสดงข้างความคิดเห็น</p>
    </section>`;
  const btn = el.querySelector("#google");
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    try {
      await signInWithGoogle();
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") toast("เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง", { error: true });
      btn.disabled = false;
    }
  });
}
