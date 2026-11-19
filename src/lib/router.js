// Hash router: works on GitHub Pages without server-side rewrites.
const routes = [];

export function route(pattern, handler) {
  const keys = [];
  const regex = new RegExp(
    "^" + pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), "([^/]+)")) + "/?$"
  );
  routes.push({ regex, keys, handler });
}

export function navigate(path) {
  if (location.hash.slice(1) === path) resolve();
  else location.hash = path;
}

let notFound = () => {};
export const fallback = (handler) => (notFound = handler);

export async function resolve() {
  const path = decodeURI(location.hash.slice(1) || "/");
  for (const { regex, keys, handler } of routes) {
    const match = path.match(regex);
    if (match) {
      const params = Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(match[i + 1])]));
      return handler(params, path);
    }
  }
  return notFound(path);
}

export function startRouter() {
  window.addEventListener("hashchange", resolve);
  return resolve();
}
