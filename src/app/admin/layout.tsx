'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Loader2, ShieldOff, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin, signOutUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/booths');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Verifying credentials...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm max-w-md w-full text-center">
          <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldOff className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-heading font-semibold text-slate-900 mb-2">Access Restricted</h1>
          <p className="text-slate-600 mb-8">
            You do not have administrative privileges. Please contact the system administrator.
          </p>
          <Button onClick={() => router.push('/booths')} className="w-full">
            Return to Storefront
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="font-heading font-semibold text-lg text-slate-900">NLF 2026 Admin</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">{user.email}</span>
            <Button variant="outline" size="sm" onClick={signOutUser}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>
      <main>
        {children}
      </main>
    </div>
  );
}
