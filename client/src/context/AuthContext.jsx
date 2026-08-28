import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase.js';
import { 
  registerUser as registerUserService, 
  loginUser as loginUserService, 
  logoutUser as logoutUserService,
  getUserProfile 
} from '../services/authService.js';
import { ROLES } from '../utils/roles.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setAuthError(null);

      if (firebaseUser) {
        setCurrentUser(firebaseUser);
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            setUserProfile(data);
            setRole(data.role || ROLES.CITIZEN);
          } else {
            const fallbackProfile = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'User',
              email: firebaseUser.email || '',
              role: ROLES.CITIZEN,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, fallbackProfile);
            setUserProfile(fallbackProfile);
            setRole(fallbackProfile.role);
          }
        } catch (err) {
          console.error('Error fetching/syncing user profile:', err);
          setAuthError('Failed to load user profile permissions.');
          setUserProfile(null);
          setRole(null);
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const register = async ({ name, email, password, role }) => {
    setLoading(true);
    setAuthError(null);
    try {
      const { user, profile } = await registerUserService({ name, email, password, role });
      setCurrentUser(user);
      setUserProfile(profile);
      setRole(profile.role);
      return profile;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const login = async ({ email, password }) => {
    setLoading(true);
    setAuthError(null);
    try {
      const { user, profile } = await loginUserService({ email, password });
      setCurrentUser(user);
      setUserProfile(profile);
      setRole(profile?.role || ROLES.CITIZEN);
      return profile;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await logoutUserService();
      setCurrentUser(null);
      setUserProfile(null);
      setRole(null);
    } catch (err) {
      console.error('Logout error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (!currentUser) return null;
    try {
      const profile = await getUserProfile(currentUser.uid);
      if (profile) {
        setUserProfile(profile);
        setRole(profile.role);
      }
      return profile;
    } catch (err) {
      console.error('Error refreshing profile:', err);
      return null;
    }
  };

  const value = {
    currentUser,
    userProfile,
    role,
    loading,
    authError,
    isAuthenticated: Boolean(currentUser),
    register,
    login,
    logout,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
