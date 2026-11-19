// Posts. Document id === slug, so a post page is a single get().
import {
  collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where, writeBatch,
} from "../lib/sdk.js";
import { db } from "../lib/firebase.js";
import { excerptFrom, plainText } from "../lib/markdown.js";
import { readingMinutes } from "../lib/dom.js";

const COL = "posts";

/**
 * @typedef {Object} Post
 * @property {string} id            slug (document id)
 * @property {string} title
 * @property {string} content       markdown
 * @property {string} excerpt
 * @property {string[]} tags
 * @property {string} coverUrl      https URL or fsimg:<id>
 * @property {"draft"|"published"} status
 * @property {boolean} featured     pinned to the top of the home page
 * @property {number} readingTime   minutes
 */

const toPost = (snap) => ({ id: snap.id, ...snap.data() });
const millis = (t) => (t?.toMillis ? t.toMillis() : 0);

let publishedCache = null; // in-memory cache for the session; cleared on writes

/** Published posts, newest first (featured first). Sorted client-side to avoid composite indexes. */
export async function listPublished({ fresh = false } = {}) {
  if (publishedCache && !fresh) return publishedCache;
  const snap = await getDocs(query(collection(db, COL), where("status", "==", "published")));
  publishedCache = snap.docs.map(toPost).sort((a, b) => millis(b.publishedAt) - millis(a.publishedAt));
  return publishedCache;
}

export async function listAll() {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map(toPost).sort((a, b) => millis(b.updatedAt) - millis(a.updatedAt));
}

export async function getPost(id) {
  const cached = publishedCache?.find((p) => p.id === id);
  if (cached) return cached;
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? toPost(snap) : null;
}

export async function getPostFresh(id) {
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? toPost(snap) : null;
}

export async function savePost(input, existing, uid) {
  const now = serverTimestamp();
  const data = {
    title: input.title.trim(),
    content: input.content,
    excerpt: excerptFrom(input.content),
    tags: input.tags,
    coverUrl: input.coverUrl.trim(),
    status: input.status,
    featured: !!input.featured,
    readingTime: readingMinutes(plainText(input.content)),
    authorId: uid,
    updatedAt: now,
    createdAt: existing?.createdAt ?? now,
    publishedAt: input.status === "published" ? existing?.publishedAt ?? now : null,
  };
  await setDoc(doc(db, COL, input.id), data);
  publishedCache = null;
  return input.id;
}

/** Deletes the post together with its comments, likes and view counter. */
export async function deletePost(id) {
  const batch = writeBatch(db);
  const [comments, likes] = await Promise.all([
    getDocs(query(collection(db, "comments"), where("postId", "==", id))),
    getDocs(query(collection(db, "likes"), where("postId", "==", id))),
  ]);
  comments.forEach((d) => batch.delete(d.ref));
  likes.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, "stats", id));
  batch.delete(doc(db, COL, id));
  await batch.commit();
  publishedCache = null;
}

/** Tag → count, most used first. */
export function tagCounts(posts) {
  const counts = new Map();
  posts.forEach((p) => (p.tags || []).forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

/** Posts sharing the most tags with `post`. */
export function relatedPosts(post, posts, limit = 3) {
  const tags = new Set(post.tags || []);
  return posts
    .filter((p) => p.id !== post.id)
    .map((p) => ({ p, score: (p.tags || []).filter((t) => tags.has(t)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || millis(b.p.publishedAt) - millis(a.p.publishedAt))
    .slice(0, limit)
    .map((x) => x.p);
}

/** Simple ranked search across title, tags and body. */
export function searchPosts(posts, term) {
  const q = term.trim().toLowerCase();
  if (!q) return [];
  const words = q.split(/\s+/);
  return posts
    .map((p) => {
      const title = p.title.toLowerCase();
      const tags = (p.tags || []).join(" ").toLowerCase();
      const body = plainText(p.content).toLowerCase();
      let score = 0;
      for (const w of words) {
        if (title.includes(w)) score += 5;
        if (tags.includes(w)) score += 3;
        if (body.includes(w)) score += 1;
        else if (!title.includes(w) && !tags.includes(w)) return { p, score: 0 };
      }
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);
}

export { serverTimestamp };
