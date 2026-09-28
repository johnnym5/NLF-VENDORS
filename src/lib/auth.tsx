'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/lib/types';

export interface AppUser {
  id: string;
  uid: string;
  email: string;
  displayName?: string;
  orgName?: string;
  role: 'vendor' | 'admin';
  profile?: UserProfile;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (e: string, p: string) => Promise<void>;
  signUpWithEmail: (e: string, p: string, orgDetails?: Partial<UserProfile>) => Promise<void>;
  signOutUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchOrCreateProfile = async (userId: string, email: string, defaultMeta?: any): Promise<UserProfile | null> => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        return {
          id: data.id,
          email: data.email,
          role: data.role,
          orgName: data.org_name,
          contactPerson: data.contact_person,
          phone: data.phone,
          sector: data.sector,
          website: data.website,
          businessDescription: data.business_description,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }

      // Profile doesn't exist — create it
      const isKnownAdmin = email.toLowerCase() === 'admin@nlf.com';
      const role = isKnownAdmin ? 'admin' : 'vendor';
      const newProfile = {
        id: userId,
        email,
        role,
        org_name: defaultMeta?.orgName || defaultMeta?.full_name || '',
        contact_person: defaultMeta?.contactPerson || defaultMeta?.full_name || '',
        phone: defaultMeta?.phone || '',
        sector: defaultMeta?.sector || '',
      };

      const { data: created } = await supabase
        .from('profiles')
        .upsert(newProfile)
        .select()
        .single();

      if (created) {
        return {
          id: created.id,
          email: created.email,
          role: created.role,
          orgName: created.org_name,
          contactPerson: created.contact_person,
          phone: created.phone,
          sector: created.sector,
          website: created.website,
          businessDescription: created.business_description,
          createdAt: created.created_at,
          updatedAt: created.updated_at,
        };
      }
    } catch (err) {
      console.error('Error fetching/creating profile:', err);
    }

    return {
      id: userId,
      email,
      role: email.toLowerCase() === 'admin@nlf.com' ? 'admin' : 'vendor',
    };
  };

  const syncUser = async (sessionUser: any) => {
    if (!sessionUser) {
      setUser(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const email = sessionUser.email || '';
    const prof = await fetchOrCreateProfile(sessionUser.id, email, sessionUser.user_metadata);
    const adminRole = prof?.role === 'admin' || email.toLowerCase() === 'admin@nlf.com';

    const appUser: AppUser = {
      id: sessionUser.id,
      uid: sessionUser.id,
      email,
      displayName: prof?.orgName || sessionUser.user_metadata?.orgName || sessionUser.user_metadata?.full_name || email.split('@')[0],
      orgName: prof?.orgName || sessionUser.user_metadata?.orgName,
      role: adminRole ? 'admin' : 'vendor',
      profile: prof || undefined,
    };

    setUser(appUser);
    setIsAdmin(adminRole);
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      syncUser(session?.user || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await syncUser(session.user);
    }
  };

  const signInWithGoogle = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://vendors.livestockcarnival.ng';
    const redirectUrl = `${origin}/auth/callback`;

    // Request OAuth URL without full page redirect
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data?.url) {
      throw new Error(error?.message || 'Failed to initialize Google Sign-In');
    }

    // Open centered popup window
    const width = 500;
    const height = 650;
    const left = typeof window !== 'undefined' ? window.screen.width / 2 - width / 2 : 100;
    const top = typeof window !== 'undefined' ? window.screen.height / 2 - height / 2 : 100;

    const popup = window.open(
      data.url,
      'GoogleAuthPopup',
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
    );

    return new Promise<void>((resolve) => {
      if (!popup) {
        // Fallback to direct redirect if popups blocked
        window.location.href = data.url;
        return resolve();
      }

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'SUPABASE_AUTH_SUCCESS') {
          window.removeEventListener('message', handleMessage);
          if (popup && !popup.closed) popup.close();
          refreshProfile().then(() => resolve());
        }
      };

      window.addEventListener('message', handleMessage);

      const checkTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkTimer);
          window.removeEventListener('message', handleMessage);
          refreshProfile().then(() => resolve());
        }
      }, 500);
    });
  };

  const signInWithEmail = async (e: string, p: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: e,
      password: p,
    });
    if (error) throw error;
  };

  const signUpWithEmail = async (e: string, p: string, orgDetails?: Partial<UserProfile>) => {
    const { data, error } = await supabase.auth.signUp({
      email: e,
      password: p,
      options: {
        data: {
          orgName: orgDetails?.orgName || '',
        },
      },
    });
    if (error) throw error;

    if (data.user) {
      await fetchOrCreateProfile(data.user.id, e, orgDetails);
    }
  };

  const signOutUser = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAdmin,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOutUser,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
