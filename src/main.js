import { isConfigured } from "./lib/firebase.js";
import { route, fallback, startRouter, resolve, navigate } from "./lib/router.js";
import { initAuth, onSession, signOut, waitForSession } from "./services/auth.js";
import { homeView } from "./views/home.js";
import { postView } from "./views/post.js";
import { aboutView } from "./views/about.js";
import { loginView } from "./views/login.js";
import { dashboardView, editorView } from "./views/admin.js";
import { notFoundView } from "./views/notfound.js";

const main = document.getElementById("main");

function setActiveNav(path) {
  const key = path.startsWith("/about") ? "about" : path === "/" || path.startsWith("/p/") ? "home" : "";
  document.querySelectorAll("[data-nav]").forEach((a) => {
    if (a.dataset.nav === key) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

/** Wrap a view: loading/error states, focus management, nav state. */
const page = (view, { admin = false } = {}) => async (params, path) => {
  setActiveNav(path);
  if (!isConfigured && view !== aboutView) {
    main.innerHTML = `<p class="state state--error">ยังไม่ได้ตั้งค่า Firebase — ใส่ค่าใน src/config/firebase-config.js</p>`;
    return;
  }
  if (admin) {
    const s = await waitForSession();
    if (!s.user || !s.isAdmin) return navigate("/login");
  }
  try {
    await view(main, params);
  } catch (err) {
    console.error(err);
    main.innerHTML = `<p class="state state--error">โหลดหน้านี้ไม่สำเร็จ ตรวจสอบการเชื่อมต่อแล้วรีเฟรชหน้า</p>`;
  }
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
};

route("/", page(homeView));
route("/p/:id", page(postView));
route("/about", page(aboutView));
route("/login", page(loginView));
route("/admin", page(dashboardView, { admin: true }));
route("/admin/new", page(editorView, { admin: true }));
route("/admin/edit/:id", page(editorView, { admin: true }));
fallback(page(notFoundView));

function renderAuthSlot(s) {
  const slot = document.getElementById("auth-slot");
  if (s.user && s.isAdmin) {
    slot.innerHTML = `<a href="#/admin">เขียน</a><button type="button" id="signout">ออก</button>`;
    slot.querySelector("#signout").addEventListener("click", () => signOut());
  } else if (s.user) {
    slot.innerHTML = `<button type="button" id="signout">ออก</button>`;
    slot.querySelector("#signout").addEventListener("click", () => signOut());
  } else {
    slot.innerHTML = "";
  }
  slot.style.display = "contents";
}

let booted = false;
onSession((s) => {
  renderAuthSlot(s);
  // Re-render when auth changes after boot (sign in/out) so guarded pages update.
  if (booted) resolve();
});

await initAuth();
booted = true;
startRouter();

