import { state, COLLECTIONS } from "../state.js";

const FIREBASE_IMPORT_APP = "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
const FIREBASE_IMPORT_FS = "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
const FIREBASE_IMPORT_AUTH = "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
const FIREBASE_IMPORT_STORAGE = "https://www.gstatic.com/firebasejs/12.7.0/firebase-storage.js";

export const firebaseConfig = {
  apiKey: "AIzaSyBiyB4pilnPpVj8vImD4PI6LF2_RtyDnv4",
  authDomain: "tabellone-produzione-liv-e313e.firebaseapp.com",
  projectId: "tabellone-produzione-liv-e313e",
  storageBucket: "tabellone-produzione-liv-e313e.firebasestorage.app",
  messagingSenderId: "537555699968",
  appId: "1:537555699968:web:4d04cb9596b67bfb0e4be5"
};

let initPromise = null;

export async function initFirebase() {
  if (state.firebase.ok) return state.firebase;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const [{ initializeApp }, fs, fa, fst] = await Promise.all([
      import(FIREBASE_IMPORT_APP),
      import(FIREBASE_IMPORT_FS),
      import(FIREBASE_IMPORT_AUTH),
      import(FIREBASE_IMPORT_STORAGE).catch(() => null)
    ]);

    const app = initializeApp(firebaseConfig);
    const db = fs.initializeFirestore(app, { experimentalAutoDetectLongPolling: true, useFetchStreams: false });
    const auth = fa.getAuth(app);
    try {
      await fa.setPersistence(auth, fa.browserLocalPersistence);
    } catch (_) {}

    let storage = null;
    let storageApi = null;
    if (fst && fst.getStorage) {
      try {
        storage = fst.getStorage(app);
        storageApi = fst;
      } catch (e) {
        console.warn("getStorage failed", e);
      }
    }

    state.firebase = {
      ok: true,
      app,
      db,
      api: fs,
      authApi: fa,
      auth,
      storage,
      storageApi
    };
    return state.firebase;
  })();

  return initPromise;
}

export function watchAuth(onReady) {
  const auth = state.firebase.auth;
  const authApi = state.firebase.authApi;
  if (!auth || !authApi) return () => {};
  return authApi.onAuthStateChanged(auth, (user) => onReady(user));
}

export async function signInWithGoogle() {
  const auth = state.firebase.auth;
  const authApi = state.firebase.authApi;
  const provider = new authApi.GoogleAuthProvider();
  try {
    await authApi.signInWithPopup(auth, provider);
  } catch (err) {
    console.warn("Google popup error", err);
    if (err?.code === "auth/popup-blocked" || err?.code === "auth/operation-not-supported-in-this-environment") {
      await authApi.signInWithRedirect(auth, provider);
      return;
    }
    throw err;
  }
}

export async function signOut() {
  if (!state.firebase?.authApi || !state.firebase?.auth) return;
  await state.firebase.authApi.signOut(state.firebase.auth);
}

export async function getAccessByEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e || !state.firebase.ok) return null;
  const fs = state.firebase.api;
  const db = state.firebase.db;
  const ref = fs.doc(db, COLLECTIONS.USERS, e);
  const snap = await fs.getDoc(ref);
  return snap.exists() ? snap.data() || null : null;
}

export function serverTimestamp() {
  return state.firebase.api.serverTimestamp();
}

export function firestore() {
  return { api: state.firebase.api, db: state.firebase.db };
}

export function storage() {
  return { api: state.firebase.storageApi, bucket: state.firebase.storage };
}
