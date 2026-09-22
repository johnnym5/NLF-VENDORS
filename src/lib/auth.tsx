'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (e: string, p: string) => Promise<void>;
  signUpWithEmail: (e: string, p: string, orgName?: string) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const tokenResult = await currentUser.getIdTokenResult();
          const hasAdminClaim = tokenResult.claims.admin === true;
          const isKnownAdminEmail = currentUser.email?.toLowerCase() === 'admin@nlf.com';
          setIsAdmin(hasAdminClaim || isKnownAdminEmail);
        } catch (error) {
          console.error("Failed to fetch custom claims:", error);
          const isKnownAdminEmail = currentUser.email?.toLowerCase() === 'admin@nlf.com';
          setIsAdmin(isKnownAdminEmail);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signInWithEmail = async (e: string, p: string) => {
    await signInWithEmailAndPassword(auth, e, p);
  };

  const signUpWithEmail = async (e: string, p: string, orgName?: string) => {
    const cred = await createUserWithEmailAndPassword(auth, e, p);
    if (orgName && cred.user) {
      try {
        await updateProfile(cred.user, { displayName: orgName });
        if (typeof window !== 'undefined') {
          localStorage.setItem(`nlf_org_${cred.user.uid}`, orgName);
        }
      } catch (err) {
        console.error('Failed to update profile displayName:', err);
      }
    }
  };

  const signOutUser = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAdmin,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOutUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
