'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, FileText } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';

export default function BoothsLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOutUser } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOutUser();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA]">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="font-heading font-semibold text-base text-slate-900 hover:text-slate-700 transition-colors"
          >
            NLF 2026
          </Link>

          <div className="flex items-center gap-3">
            {loading ? (
              <div className="w-20 h-8 bg-slate-100 rounded animate-pulse" />
            ) : user ? (
              <>
                <Link
                  href="/booths/permit"
                  className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">My Permit</span>
                </Link>
                <span className="text-sm text-slate-400 hidden sm:inline">
                  {user.email}
                </span>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-3.5 h-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </>
            ) : (
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
