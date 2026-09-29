// Due Next — cloud sync with Firebase (sign-in + Firestore database).
// Each person's assignments live at users/{their id}/assignments/{assignment id},
// and the security rules in firestore.rules make sure only they can read or change them.

const V = "12.19.0";
const BASE = `https://www.gstatic.com/firebasejs/${V}/`;

export async function startCloud(config, { onUser, onItems, onError }) {
  const [{ initializeApp }, authMod, fs] = await Promise.all([
    import(BASE + "firebase-app.js"),
    import(BASE + "firebase-auth.js"),
    import(BASE + "firebase-firestore.js"),
  ]);
  const {
    getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup,
    signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut,
    setPersistence, browserLocalPersistence,
  } = authMod;
  const {
    initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache,
    collection, doc, setDoc, deleteDoc, getDocs, onSnapshot, writeBatch,
  } = fs;

  const app = initializeApp(config);
  const auth = getAuth(app);
  try { await setPersistence(auth, browserLocalPersistence); } catch (e) {}

  // Keep a copy on the device so the list works offline and syncs when back online.
  let db;
  try { db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); }
  catch (e) { db = initializeFirestore(app, { localCache: memoryLocalCache() }); }

  let user = null;
  let unsub = null;
  const col = () => collection(db, "users", user.uid, "assignments");
  const body = (item) => { const { id, ...rest } = item; return rest; };

  onAuthStateChanged(auth, async (u) => {
    if (unsub) { unsub(); unsub = null; }
    user = u;
    onUser(u ? { uid: u.uid, email: u.email || "", name: u.displayName || "" } : null);
    if (!u) return;
    unsub = onSnapshot(col(),
      (snap) => onItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })), snap.metadata.hasPendingWrites || snap.metadata.fromCache),
      (err) => onError("Couldn't load your synced list. " + friendly(err)));
  });

  function need() { if (!user) throw new Error("Not signed in"); }

  return {
    get user() { return user; },
    async save(item) { need(); await setDoc(doc(col(), item.id), body(item)); },
    async remove(id) { need(); await deleteDoc(doc(col(), id)); },
    async saveMany(list) {
      need();
      for (let i = 0; i < list.length; i += 400) {
        const b = writeBatch(db);
        for (const it of list.slice(i, i + 400)) b.set(doc(col(), it.id), body(it));
        await b.commit();
      }
    },
    // Upload anything that's only on this device (used right after signing in).
    async mergeLocal(localItems) {
      need();
      const snap = await getDocs(col());
      const have = new Set(snap.docs.map((d) => d.id));
      const missing = localItems.filter((it) => !have.has(it.id));
      if (missing.length) await this.saveMany(missing);
      return missing.length;
    },
    signInGoogle: () => signInWithPopup(auth, new GoogleAuthProvider()),
    signInEmail: (email, pw) => signInWithEmailAndPassword(auth, email, pw),
    signUpEmail: (email, pw) => createUserWithEmailAndPassword(auth, email, pw),
    resetPassword: (email) => sendPasswordResetEmail(auth, email),
    signOut: () => signOut(auth),
  };
}

export function friendly(err) {
  const code = (err && err.code) || "";
  const map = {
    "auth/invalid-credential": "That email and password don't match. Check them, or tap Create account if you're new.",
    "auth/wrong-password": "That password isn't right.",
    "auth/user-not-found": "There's no account with that email yet. Tap Create account.",
    "auth/email-already-in-use": "There's already an account with that email. Tap Sign in instead.",
    "auth/weak-password": "Use a password with at least 6 characters.",
    "auth/invalid-email": "That email address doesn't look right.",
    "auth/popup-blocked": "Your browser blocked the Google sign-in window. Allow pop-ups, or sign in with email instead.",
    "auth/popup-closed-by-user": "The Google sign-in window was closed before finishing.",
    "auth/cancelled-popup-request": "The Google sign-in window was closed before finishing.",
    "auth/unauthorized-domain": "This website isn't allowed to sign in yet. In Firebase, add it under Authentication → Settings → Authorized domains.",
    "auth/operation-not-allowed": "This sign-in method isn't turned on. In Firebase, turn it on under Authentication → Sign-in method.",
    "auth/network-request-failed": "No internet connection. Try again when you're online.",
    "auth/too-many-requests": "Too many tries. Wait a few minutes and try again.",
    "permission-denied": "Firebase refused access. Check that you published the rules from firestore.rules.",
    "unavailable": "You're offline. Changes will sync when you're back online.",
  };
  return map[code] || (err && err.message) || "Something went wrong.";
}
