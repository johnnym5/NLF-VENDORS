'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

export interface AppUser {
  id: string;
  uid: string;
  email: string;
  displayName?: string;
  orgName?: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (e: string, p: string) => Promise<void>;
  signUpWithEmail: (e: string, p: string, orgName?: string) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const email = session.user.email || '';
        const orgName = session.user.user_metadata?.orgName;
        const appUser: AppUser = {
          id: session.user.id,
          uid: session.user.id,
          email,
          displayName: orgName || session.user.user_metadata?.full_name || email.split('@')[0],
          orgName,
        };
        setUser(appUser);
        setIsAdmin(email.toLowerCase() === 'admin@nlf.com' || session.user.app_metadata?.role === 'admin');
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const email = session.user.email || '';
        const orgName = session.user.user_metadata?.orgName;
        const appUser: AppUser = {
          id: session.user.id,
          uid: session.user.id,
          email,
          displayName: orgName || session.user.user_metadata?.full_name || email.split('@')[0],
          orgName,
        };
        setUser(appUser);
        setIsAdmin(email.toLowerCase() === 'admin@nlf.com' || session.user.app_metadata?.role === 'admin');
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://vendors.livestockcarnival.ng';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/login`,
      },
    });
    if (error) throw error;
  };

  const signInWithEmail = async (e: string, p: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: e,
      password: p,
    });
    if (error) throw error;
  };

  const signUpWithEmail = async (e: string, p: string, orgName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: e,
      password: p,
      options: {
        data: {
          orgName: orgName || '',
        },
      },
    });
    if (error) throw error;
    if (orgName && data.user && typeof window !== 'undefined') {
      localStorage.setItem(`nlf_org_${data.user.id}`, orgName);
    }
  };

  const signOutUser = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
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
