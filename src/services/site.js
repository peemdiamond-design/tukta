// Site settings, newsletter subscribers and Firestore-hosted images.
import {
  addDoc, collection, deleteDoc, doc, getCountFromServer, getDoc, getDocs, serverTimestamp, setDoc,
} from "../lib/sdk.js";
import { db } from "../lib/firebase.js";
import { SITE } from "../config/firebase-config.js";
import { compressImage } from "../lib/images.js";

/* ---------- settings: site/settings ---------- */

export const DEFAULT_SETTINGS = {
  name: SITE.name,
  tagline: SITE.tagline,
  description: SITE.description,
  about:
    "สวัสดี ฉันชื่อตุ๊กตา ที่นี่คือสมุดบันทึกออนไลน์ที่ฉันใช้จดเรื่องเล็ก ๆ ในแต่ละวัน ทั้งหนังสือที่อ่าน ร้านกาแฟที่ชอบ และความคิดที่อยากเก็บไว้\n\nทุกบันทึกเขียนเอง ไม่มีโฆษณา อ่านได้ตามสบาย",
  avatarUrl: "",
  socials: { facebook: "", instagram: "", x: "", line: "", email: "" },
};

let settingsCache = null;

export async function getSettings() {
  if (settingsCache) return settingsCache;
  try {
    const snap = await getDoc(doc(db, "site", "settings"));
    const data = snap.exists() ? snap.data() : {};
    settingsCache = { ...DEFAULT_SETTINGS, ...data, socials: { ...DEFAULT_SETTINGS.socials, ...(data.socials || {}) } };
  } catch {
    settingsCache = DEFAULT_SETTINGS;
  }
  return settingsCache;
}

export async function saveSettings(values) {
  await setDoc(doc(db, "site", "settings"), { ...values, updatedAt: serverTimestamp() });
  settingsCache = null;
}

/* ---------- subscribers: subscribers/{email} ---------- */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Returns false if this email is already subscribed. */
export async function subscribe(email) {
  const clean = email.trim().toLowerCase();
  if (!EMAIL_RE.test(clean)) throw new Error("invalid-email");
  try {
    await setDoc(doc(db, "subscribers", clean), { email: clean, createdAt: serverTimestamp() });
    return true;
  } catch (err) {
    // An existing doc turns create into update, which the rules deny.
    if (err.code === "permission-denied") return false;
    throw err;
  }
}

export async function listSubscribers() {
  const snap = await getDocs(collection(db, "subscribers"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
}

export const deleteSubscriber = (id) => deleteDoc(doc(db, "subscribers", id));

/* ---------- images: images/{autoId} { data: webp data URL } ---------- */

const imageCache = new Map();

export async function uploadImage(file, uid) {
  const { data, width, height } = await compressImage(file);
  const ref = await addDoc(collection(db, "images"), {
    data, width, height, name: file.name.slice(0, 120), uploadedBy: uid, createdAt: serverTimestamp(),
  });
  imageCache.set(ref.id, data);
  return `fsimg:${ref.id}`;
}

async function loadImage(id) {
  if (!imageCache.has(id)) {
    imageCache.set(id, getDoc(doc(db, "images", id)).then((s) => s.data()?.data || ""));
  }
  return imageCache.get(id);
}

/** Resolves an image reference (https URL or fsimg:id) to a usable src. */
export async function resolveImage(ref = "") {
  if (ref.startsWith("fsimg:")) return loadImage(ref.slice(6));
  return /^https?:\/\//.test(ref) ? ref : "";
}

/** Fill in <img data-fsimg="id"> elements inside `root`. */
export function hydrateImages(root) {
  root.querySelectorAll("img[data-fsimg]").forEach(async (img) => {
    const src = await loadImage(img.dataset.fsimg);
    if (src) img.src = src;
    img.removeAttribute("data-fsimg");
  });
}

/* ---------- counts for the dashboard ---------- */

export async function countOf(col) {
  return (await getCountFromServer(collection(db, col))).data().count;
}
