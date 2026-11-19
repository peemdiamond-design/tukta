import {
  initializeApp,
  getAuth,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "./sdk.js";
import { firebaseConfig } from "../config/firebase-config.js";

export const isConfigured = !String(firebaseConfig.apiKey).startsWith("REPLACE");

export const app = isConfigured ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = app
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  : null;
