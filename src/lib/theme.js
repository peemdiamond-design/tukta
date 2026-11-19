// Light / dark theme with system default and a persisted override.
const KEY = "tukta-theme";

const system = () => (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
export const currentTheme = () => document.documentElement.dataset.theme || system();

function apply(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#1E2316" : "#3B4429");
  document.querySelectorAll("[data-theme-toggle]").forEach((b) => {
    b.setAttribute("aria-pressed", String(theme === "dark"));
    b.setAttribute("aria-label", theme === "dark" ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด");
    b.textContent = theme === "dark" ? "☀" : "☾";
  });
}

export function initTheme() {
  apply(localStorage.getItem(KEY) || system());
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (!localStorage.getItem(KEY)) apply(system());
  });
}

export function toggleTheme() {
  const next = currentTheme() === "dark" ? "light" : "dark";
  localStorage.setItem(KEY, next);
  apply(next);
}
