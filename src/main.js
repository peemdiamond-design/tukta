import { isConfigured } from "./lib/firebase.js";
import { route, fallback, beforeEach, startRouter, resolve, navigate } from "./lib/router.js";
import { initTheme, toggleTheme } from "./lib/theme.js";
import { html } from "./lib/dom.js";
import { initAuth, onSession, signOut, waitForSession } from "./services/auth.js";
import { getSettings } from "./services/site.js";
import { homeView } from "./views/home.js";
import { postView } from "./views/post.js";
import { aboutView } from "./views/about.js";
import { tagView, archiveView, searchView } from "./views/browse.js";
import { loginView } from "./views/login.js";
import { notFoundView } from "./views/notfound.js";
import { dashboardView } from "./views/admin/dashboard.js";
import { editorView } from "./views/admin/editor.js";
import { commentsAdminView, subscribersView, settingsView } from "./views/admin/manage.js";
import { editorState } from "./views/admin/shared.js";

initTheme();
const main = document.getElementById("main");

function setActiveNav(path) {
  const key =
    path === "/" || path.startsWith("/p/") ? "home"
    : path.startsWith("/archive") || path.startsWith("/tag/") ? "archive"
    : path.startsWith("/about") ? "about"
    : path.startsWith("/search") ? "search"
    : path.startsWith("/admin") ? "admin" : "";
  document.querySelectorAll("[data-nav]").forEach((a) =>
    a.dataset.nav === key ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")
  );
}

/** Wrap a view: config check, admin guard, error state, focus + scroll management. */
const page = (view, { admin = false } = {}) => async (params, path) => {
  setActiveNav(path);
  if (!isConfigured) {
    main.innerHTML = `<p class="state state--error">ยังไม่ได้ตั้งค่า Firebase — ใส่ค่าใน src/config/firebase-config.js</p>`;
    return;
  }
  if (admin) {
    const s = await waitForSession();
    if (!s.isAdmin) return navigate("/login", { replace: true });
  }
  try {
    await view(main, params);
  } catch (err) {
    console.error(err);
    main.innerHTML = `<section class="lead-entry"><h1>โหลดหน้านี้ไม่สำเร็จ</h1>
      <p class="lead-entry__excerpt">ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง</p>
      <button class="btn" onclick="location.reload()">โหลดใหม่</button></section>`;
  }
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
};

route("/", page(homeView));
route("/p/:id", page(postView));
route("/tag/:tag", page(tagView));
route("/archive", page(archiveView));
route("/search", page(searchView));
route("/about", page(aboutView));
route("/login", page(loginView));
route("/admin", page(dashboardView, { admin: true }));
route("/admin/new", page(editorView, { admin: true }));
route("/admin/edit/:id", page(editorView, { admin: true }));
route("/admin/comments", page(commentsAdminView, { admin: true }));
route("/admin/subscribers", page(subscribersView, { admin: true }));
route("/admin/settings", page(settingsView, { admin: true }));
fallback(page(notFoundView));

// Unsaved-changes guard for the editor.
let lastHash = location.hash;
beforeEach(() => {
  if (editorState.dirty && location.hash !== lastHash) {
    if (!confirm("มีการแก้ไขที่ยังไม่ได้บันทึก ออกจากหน้านี้เลยไหม? (ฉบับบันทึกอัตโนมัติยังอยู่ในเครื่อง)")) {
      history.replaceState(null, "", lastHash);
      return false;
    }
    editorState.dirty = false;
  }
  lastHash = location.hash;
});
addEventListener("beforeunload", (e) => {
  if (editorState.dirty) { e.preventDefault(); e.returnValue = ""; }
});

/* ---------- header: account area + theme toggle ---------- */
function renderAuthSlot(s) {
  const slot = document.getElementById("auth-slot");
  slot.innerHTML = s.isAdmin
    ? html`<a href="#/admin" data-nav="admin">เขียน</a><button type="button" data-signout>ออก</button>`
    : s.isMember
      ? html`<a href="#/login" title="${s.user.email}">บัญชี</a><button type="button" data-signout>ออก</button>`
      : `<a href="#/login">เข้าสู่ระบบ</a>`;
  slot.querySelector("[data-signout]")?.addEventListener("click", async () => {
    await signOut();
    if (location.hash.startsWith("#/admin")) navigate("/");
  });
}

document.querySelectorAll("[data-theme-toggle]").forEach((b) => b.addEventListener("click", toggleTheme));

async function applySettings() {
  if (!isConfigured) return;
  const s = await getSettings();
  document.querySelectorAll("[data-site-name]").forEach((el) => (el.textContent = s.name));
  const foot = document.querySelector("[data-footer]");
  if (foot) foot.innerHTML = html`<p>© ${new Date().getFullYear()} ${s.name} ${s.tagline}</p>
    <p><a href="#/about">เกี่ยวกับ</a> <a href="#/archive">บันทึกทั้งหมด</a> <a href="#/search">ค้นหา</a></p>`;
}
document.addEventListener("settings-changed", async () => {
  await applySettings();
});

let booted = false;
let lastKey = "";
onSession((s) => {
  renderAuthSlot(s);
  setActiveNav(location.hash.slice(1).split("?")[0] || "/");
  // Re-render on sign in/out (not on anonymous sign-in for likes) so guarded pages update.
  const key = `${s.isMember}:${s.isAdmin}:${s.isMember ? s.user.uid : ""}`;
  if (booted && key !== lastKey) resolve();
  lastKey = key;
});

if (isConfigured) await initAuth();
booted = true;
applySettings();
startRouter();

// Offline support: cache the app shell (only on the real site, never on localhost dev).
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
