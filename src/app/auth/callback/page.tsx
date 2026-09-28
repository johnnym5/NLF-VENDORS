'use client';

import React, { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  useEffect(() => {
    async function handleCallback() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && window.opener) {
          window.opener.postMessage({ type: 'SUPABASE_AUTH_SUCCESS' }, window.location.origin);
        }
      } catch (err) {
        console.error('Error handling auth callback:', err);
      } finally {
        setTimeout(() => {
          if (window.opener) {
            window.opener.postMessage({ type: 'SUPABASE_AUTH_SUCCESS' }, window.location.origin);
          }
          window.close();
        }, 500);
      }
    }
    handleCallback();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center font-sans">
      <Loader2 className="w-8 h-8 animate-spin text-slate-700 mb-3" />
      <h3 className="text-base font-bold text-slate-900 mb-1">Authenticating with Google</h3>
      <p className="text-xs text-slate-500">Please wait while your account is verified...</p>
    </div>
  );
}
