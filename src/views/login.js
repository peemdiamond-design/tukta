import { html, setTitle, toast } from "../lib/dom.js";
import { session, signInWithGoogle, signOut } from "../services/auth.js";
import { navigate } from "../lib/router.js";

export function loginView(el) {
  setTitle("เข้าสู่ระบบ");

  if (session.user && session.isAdmin) return navigate("/admin");

  if (session.user && !session.isAdmin) {
    el.innerHTML = html`
      <section class="login">
        <h1>บัญชีนี้ยังไม่มีสิทธิ์เขียน</h1>
        <p>คุณเข้าสู่ระบบเป็น ${session.user.email} แต่บัญชีนี้ยังไม่ได้เป็นผู้ดูแล
        ให้เพิ่มเอกสาร <code>admins/${session.user.uid}</code> ใน Firestore แล้วรีเฟรชหน้านี้</p>
        <button class="btn btn--ghost" id="out">ออกจากระบบ</button>
      </section>`;
    el.querySelector("#out").addEventListener("click", () => signOut());
    return;
  }

  el.innerHTML = `
    <section class="login">
      <h1>เข้าสู่ระบบเพื่อเขียน</h1>
      <p>หน้านี้สำหรับเจ้าของบล็อกเท่านั้น</p>
      <button class="btn" id="google">เข้าสู่ระบบด้วย Google</button>
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
