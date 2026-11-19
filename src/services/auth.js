import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { auth, db } from "../lib/firebase.js";

/** @type {{ user: import("firebase/auth").User | null, isAdmin: boolean, ready: boolean }} */
export const session = { user: null, isAdmin: false, ready: false };
const listeners = new Set();

export function onSession(fn) {
  listeners.add(fn);
  if (session.ready) fn(session);
  return () => listeners.delete(fn);
}

// Admin = a document exists at admins/{uid}. Rules mirror this check server-side.
async function checkAdmin(uid) {
  try {
    const snap = await getDoc(doc(db, "admins", uid));
    return snap.exists();
  } catch {
    return false;
  }
}

export function initAuth() {
  if (!auth) {
    session.ready = true;
    listeners.forEach((fn) => fn(session));
    return Promise.resolve(session);
  }
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      session.user = user;
      session.isAdmin = user ? await checkAdmin(user.uid) : false;
      const first = !session.ready;
      session.ready = true;
      listeners.forEach((fn) => fn(session));
      if (first) resolve(session);
    });
  });
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(auth, provider);
}

export const signOut = () => fbSignOut(auth);

export async function waitForSession() {
  if (session.ready) return session;
  return new Promise((resolve) => {
    const off = onSession((s) => { off(); resolve(s); });
  });
}
