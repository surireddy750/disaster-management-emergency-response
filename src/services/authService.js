import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from './firebase.js';
import { ROLES } from '../utils/roles.js';

/**
 * Register a new user with Firebase Auth and store profile in Firestore users/{uid}
 */
export async function registerUser({ name, email, password, role = ROLES.CITIZEN }) {
  if (!name || !email || !password) {
    throw new Error('Please fill in all required fields.');
  }

  // Validate role
  const validRoles = Object.values(ROLES);
  if (!validRoles.includes(role)) {
    throw new Error('Invalid user role selected.');
  }

  // 1. Create user in Firebase Authentication
  const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const firebaseUser = userCredential.user;

  // 2. Update display name in Firebase Auth
  await updateProfile(firebaseUser, { displayName: name.trim() });

  // 3. Persist user profile document in Firestore: users/{uid}
  const userProfile = {
    uid: firebaseUser.uid,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role: role,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'users', firebaseUser.uid), userProfile);

  return { user: firebaseUser, profile: userProfile };
}

/**
 * Login user with Firebase Auth and retrieve user profile from Firestore
 */
export async function loginUser({ email, password }) {
  if (!email || !password) {
    throw new Error('Please enter both email and password.');
  }

  const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
  const firebaseUser = userCredential.user;

  // Retrieve user document from Firestore
  const profile = await getUserProfile(firebaseUser.uid);

  return { user: firebaseUser, profile };
}

/**
 * Log out the currently authenticated user
 */
export async function logoutUser() {
  await signOut(auth);
}

/**
 * Fetch user profile from Firestore by UID
 */
export async function getUserProfile(uid) {
  if (!uid) return null;

  try {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      return userDocSnap.data();
    } else {
      // Fallback if doc doesn't exist yet
      console.warn(`No Firestore profile found for UID: ${uid}`);
      return null;
    }
  } catch (error) {
    console.error('Error fetching user profile from Firestore:', error);
    throw error;
  }
}
