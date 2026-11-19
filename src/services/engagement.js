// Comments, likes and view counts.
import {
  addDoc, collection, deleteDoc, doc, getCountFromServer, getDoc, getDocs, increment,
  query, serverTimestamp, setDoc, updateDoc, where,
} from "../lib/sdk.js";
import { db } from "../lib/firebase.js";
import { ensureUser, session } from "./auth.js";

const millis = (t) => (t?.toMillis ? t.toMillis() : Date.now());

/* ---------- comments: comments/{autoId} ---------- */

export async function listComments(postId) {
  const snap = await getDocs(query(collection(db, "comments"), where("postId", "==", postId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => millis(a.createdAt) - millis(b.createdAt));
}

export async function listAllComments() {
  const snap = await getDocs(collection(db, "comments"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => millis(b.createdAt) - millis(a.createdAt));
}

export async function addComment(postId, body) {
  const u = session.user;
  if (!session.isMember) throw new Error("ต้องเข้าสู่ระบบด้วย Google ก่อนแสดงความคิดเห็น");
  const data = {
    postId,
    uid: u.uid,
    name: (u.displayName || "ผู้อ่าน").slice(0, 80),
    photoURL: (u.photoURL || "").slice(0, 500),
    body: body.trim(),
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, "comments"), data);
  return { id: ref.id, ...data, createdAt: null };
}

export const deleteComment = (id) => deleteDoc(doc(db, "comments", id));

/* ---------- likes: likes/{postId}_{uid} ---------- */

export async function likeState(postId) {
  const countSnap = await getCountFromServer(query(collection(db, "likes"), where("postId", "==", postId)));
  const uid = session.user?.uid;
  const liked = uid ? (await getDoc(doc(db, "likes", `${postId}_${uid}`))).exists() : false;
  return { count: countSnap.data().count, liked };
}

export async function toggleLike(postId, liked) {
  const user = await ensureUser();
  const ref = doc(db, "likes", `${postId}_${user.uid}`);
  if (liked) await deleteDoc(ref);
  else await setDoc(ref, { postId, uid: user.uid, createdAt: serverTimestamp() });
  return !liked;
}

/* ---------- views: stats/{postId} { views } ---------- */

/** Counts at most one view per post per browser session. */
export async function recordView(postId) {
  const key = `viewed:${postId}`;
  const ref = doc(db, "stats", postId);
  try {
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      const snap = await getDoc(ref);
      if (snap.exists()) await updateDoc(ref, { views: increment(1) });
      else await setDoc(ref, { views: 1 });
    }
    return (await getDoc(ref)).data()?.views ?? 0;
  } catch {
    return 0; // view counting must never break reading
  }
}

export async function listStats() {
  const snap = await getDocs(collection(db, "stats"));
  return Object.fromEntries(snap.docs.map((d) => [d.id, d.data().views || 0]));
}
