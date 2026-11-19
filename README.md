# ตุ๊กตา — personal blog

Static blog served by **GitHub Pages** at <https://tukta.peemcn25.dev>, with
**Firebase Authentication** (Google sign-in) and **Cloud Firestore** as the database.
No build step: plain ES modules + the Firebase web SDK from the gstatic CDN.

## Structure

```
index.html              app shell (spine nav + <main>)
404.html                redirects /path → /#/path for GitHub Pages
assets/css/             tokens → base → layout → components
src/
  config/               firebase-config.js (public web config) + site constants
  lib/                  firebase init, hash router, DOM/escaping helpers, safe markdown
  services/             auth (session + admin check), posts (Firestore CRUD)
  views/                home, post, about, login, admin dashboard + editor
firestore.rules         security rules (source of truth for access control)
firebase.json           for `firebase deploy --only firestore`
.github/workflows/      Pages deploy on push to main
```

## Data model

- `posts/{slug}` — `title, content (markdown), excerpt, tags[], coverUrl, status (draft|published), authorId, createdAt, updatedAt, publishedAt`
- `admins/{uid}` — empty doc; its existence grants write access. Create it by hand in the console.

## Local dev

```bash
python3 -m http.server 5510
```

Open http://localhost:5510 (add `localhost` to Firebase Auth authorized domains — it is there by default).

## Becoming the admin

1. Visit `/#/login`, sign in with Google.
2. The page shows your UID. In Firestore, create document `admins/<UID>` (no fields needed).
3. Refresh — the spine now shows **เขียน**.

## Deploying rules

```bash
npx firebase-tools deploy --only firestore:rules --project <project-id>
```
