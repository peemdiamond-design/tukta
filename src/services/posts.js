// Data access for posts. Document id === slug, so public reads are a single get().
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { db } from "../lib/firebase.js";
import { excerptFrom } from "../lib/markdown.js";

const COL = "posts";

/**
 * @typedef {Object} Post
 * @property {string} id         slug, also the document id
 * @property {string} title
 * @property {string} content    markdown
 * @property {string} excerpt
 * @property {string[]} tags
 * @property {string} coverUrl
 * @property {"draft"|"published"} status
 * @property {import("firebase/firestore").Timestamp} createdAt
 * @property {import("firebase/firestore").Timestamp} updatedAt
 * @property {import("firebase/firestore").Timestamp|null} publishedAt
 */

const toPost = (snap) => ({ id: snap.id, ...snap.data() });
const millis = (t) => (t?.toMillis ? t.toMillis() : 0);
const byNewest = (field) => (a, b) => millis(b[field] ?? b.updatedAt) - millis(a[field] ?? a.updatedAt);

/** Published posts, newest first. Sorted client-side to avoid a composite index. */
export async function listPublished() {
  const snap = await getDocs(query(collection(db, COL), where("status", "==", "published")));
  return snap.docs.map(toPost).sort(byNewest("publishedAt"));
}

/** All posts, including drafts. Admin only (enforced by rules). */
export async function listAll() {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map(toPost).sort(byNewest("updatedAt"));
}

export async function getPost(id) {
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? toPost(snap) : null;
}

export async function savePost({ id, title, content, tags, coverUrl, status }, existing, uid) {
  const now = serverTimestamp();
  const data = {
    title: title.trim(),
    content,
    excerpt: excerptFrom(content),
    tags,
    coverUrl: coverUrl.trim(),
    status,
    authorId: uid,
    updatedAt: now,
    createdAt: existing?.createdAt ?? now,
    publishedAt:
      status === "published" ? existing?.publishedAt ?? now : null,
  };
  await setDoc(doc(db, COL, id), data);
  return id;
}

export const deletePost = (id) => deleteDoc(doc(db, COL, id));
