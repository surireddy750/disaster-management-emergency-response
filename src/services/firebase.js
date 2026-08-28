import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase app (safe for multiple imports)
let app;
if (getApps().length > 0) {
  app = getApp();
} else {
  app = initializeApp(firebaseConfig);
}

// Initialize Firestore with memory-only cache to prevent IndexedDB
// persistence issues that cause "client is offline" errors in environments
// where IndexedDB is unavailable or blocked (private browsing, sandboxed iframes, etc).
let db;
try {
  db = initializeFirestore(app, {
    localCache: memoryLocalCache()
  });
} catch (e) {
  // If Firestore was already initialized (e.g. HMR), fall back to getFirestore
  db = getFirestore(app);
}

// Initialize and export other Firebase services
export const auth = getAuth(app);
export const storage = getStorage(app);

export { db, firebaseConfig };
export default app;
