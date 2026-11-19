// Single place that pins the Firebase SDK version (loaded from the gstatic CDN).
export {
  initializeApp,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";

export {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signInAnonymously,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

export {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  getDoc,
  getDocs,
  getCountFromServer,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  increment,
  serverTimestamp,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
