import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signInAnonymously,
  signOut as fbSignOut,
  doc,
  getDoc,
} from "../lib/sdk.js";
import { auth, db } from "../lib/firebase.js";

/**
 * user        Firebase user (Google or anonymous) or null
 * isAdmin     true when admins/{uid} exists (rules enforce the same check)
 * isMember    signed in with Google (can comment)
 */
export const session = { user: null, isAdmin: false, isMember: false, ready: false };
const listeners = new Set();

export function onSession(fn) {
  listeners.add(fn);
  if (session.ready) fn(session);
  return () => listeners.delete(fn);
}

async function checkAdmin(user) {
  if (!user || user.isAnonymous) return false;
  try {
    return (await getDoc(doc(db, "admins", user.uid))).exists();
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
      session.isMember = !!user && !user.isAnonymous;
      session.isAdmin = await checkAdmin(user);
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
  try {
    return await signInWithPopup(auth, provider);
  } catch (err) {
    // Some browsers block popups; fall back to a full-page redirect.
    if (err.code === "auth/popup-blocked") return signInWithRedirect(auth, provider);
    throw err;
  }
}

/** Likes don't need an account: give the reader an anonymous identity on first use. */
export async function ensureUser() {
  if (auth.currentUser) return auth.currentUser;
  const cred = await signInAnonymously(auth);
  return cred.user;
}

export const signOut = () => fbSignOut(auth);

export function waitForSession() {
  if (session.ready) return Promise.resolve(session);
  return new Promise((resolve) => {
    const off = onSession((s) => { off(); resolve(s); });
  });
}
