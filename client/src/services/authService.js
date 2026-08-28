import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc 
} from 'firebase/firestore';
import { auth, db } from './firebase.js';
import { ROLES } from '../utils/roles.js';

export async function registerUser({ name, email, password, role = ROLES.CITIZEN }) {
  if (!name || !email || !password) {
    throw new Error('Please fill in all required fields.');
  }

  const validRoles = Object.values(ROLES);
  if (!validRoles.includes(role)) {
    throw new Error('Invalid user role selected.');
  }

  const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const firebaseUser = userCredential.user;

  await updateProfile(firebaseUser, { displayName: name.trim() });

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

export async function loginUser({ email, password }) {
  if (!email || !password) {
    throw new Error('Please enter both email and password.');
  }

  const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
  const firebaseUser = userCredential.user;

  const profile = await getUserProfile(firebaseUser.uid);

  return { user: firebaseUser, profile };
}

export async function logoutUser() {
  await signOut(auth);
}

export async function getUserProfile(uid) {
  if (!uid) return null;

  try {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      return userDocSnap.data();
    } else {
      console.warn(`No Firestore profile found for UID: ${uid}`);
      return null;
    }
  } catch (error) {
    console.error('Error fetching user profile from Firestore:', error);
    throw error;
  }
}
