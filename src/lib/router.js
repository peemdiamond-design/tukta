// Hash router: works on GitHub Pages without server-side rewrites.
// Routes look like #/p/my-post or #/search?q=คำค้น
const routes = [];
let notFound = () => {};
let before = () => {};

export function route(pattern, handler) {
  const keys = [];
  const regex = new RegExp("^" + pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), "([^/]+)")) + "/?$");
  routes.push({ regex, keys, handler });
}

export const fallback = (handler) => (notFound = handler);
/** Runs before each route; return false to cancel (e.g. unsaved-changes guard). */
export const beforeEach = (fn) => (before = fn);

export function currentPath() {
  const [path, qs = ""] = location.hash.slice(1).split("?");
  return { path: path || "/", query: new URLSearchParams(qs) };
}

export function navigate(to, { replace = false } = {}) {
  const target = "#" + to;
  if (location.hash === target) return resolve();
  if (replace) history.replaceState(null, "", target), resolve();
  else location.hash = to;
}

export async function resolve() {
  const { path, query } = currentPath();
  if ((await before(path)) === false) return;
  for (const { regex, keys, handler } of routes) {
    const match = path.match(regex);
    if (match) {
      const params = Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(match[i + 1])]));
      return handler({ ...params, query }, path);
    }
  }
  return notFound({ query }, path);
}

export function startRouter() {
  window.addEventListener("hashchange", resolve);
  return resolve();
}
