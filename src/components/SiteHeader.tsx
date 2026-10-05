'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { ExhibitionCategorySwitch } from '@/components/ExhibitionCategorySwitch';
import { useExhibitionCategory } from '@/lib/exhibition-category';

export function SiteHeader() {
  const { user, loading, signOutUser } = useAuth();
  const { activeCategory } = useExhibitionCategory();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOutUser();
    router.push('/');
  };

  return (
    <header className={`sticky top-0 z-50 border-b shadow-sm backdrop-blur ${activeCategory?.theme === 'peach' ? 'border-orange-200 bg-orange-50/95' : activeCategory?.theme === 'green' ? 'border-emerald-200 bg-emerald-50/95' : 'border-slate-200 bg-white/95'}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="National Livestock Festival portal home">
          <Image src="/logo.jpeg" alt="Livestock Carnival" width={44} height={44} className="h-11 w-11 rounded-full object-cover" priority />
          <span className="font-heading text-lg font-bold leading-none text-slate-900">Vendor</span>
        </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-5 text-sm font-medium text-slate-600 md:flex">
          <Link href="/booths" className="hover:text-[#1E4D38]">{activeCategory?.name || 'Exhibition Spaces'}</Link>
          <Link href="/faq" className="hover:text-[#1E4D38]">FAQ</Link>
          <Link href="/contact" className="hover:text-[#1E4D38]">Contact</Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {!loading && <ExhibitionCategorySwitch compact />}
          {loading ? (
            <div className="h-9 w-20 animate-pulse rounded bg-slate-100" />
          ) : user ? (
            <>
              <Link href="/booths/permit" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">My Permit</span>
              </Link>
              <span className="hidden max-w-48 truncate text-sm text-slate-400 lg:inline">{user.email}</span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </>
          ) : (
            <Link href="/login"><Button variant="outline" size="sm">Vendor Login</Button></Link>
          )}
        </div>
      </div>
    </header>
  );
}
