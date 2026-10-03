'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useTiers } from '@/lib/supabase-queries';
import { formatNaira } from '@/lib/design-tokens';

export default function LandingPage() {
  const { tiers, loading, error } = useTiers();

  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 pt-20 pb-16 text-center">
        <div className="animate-fade-in">
          <p className="text-sm text-slate-500 uppercase tracking-widest mb-3 font-medium">
            Abuja · 2026 · Vendor Portal
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold text-slate-900 mb-4 leading-tight">
            National Livestock<br />Festival 2026
          </h1>
          <p className="text-lg text-slate-600 max-w-xl mx-auto mb-10">
            Bring your business to Nigeria&apos;s leading livestock and agribusiness gathering. Explore exhibition spaces and find the right fit for your team.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md mx-auto sm:max-w-none">
            <Link
              href="/booths"
              className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white font-medium px-8 py-3.5 rounded-lg hover:bg-slate-800 transition-colors duration-200 text-base shadow-sm w-full sm:w-auto"
            >
            Explore Available Booths
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 border border-slate-300 text-slate-700 font-medium px-8 py-3.5 rounded-lg hover:bg-slate-50 transition-colors duration-200 text-base w-full sm:w-auto"
            >
              Vendor Login
            </Link>
          </div>
        </div>
      </section>

      {/* Booth Highlights */}
      <section className="px-4 pb-20">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-sm text-slate-500 uppercase tracking-wider mb-2 font-medium">
            Find Your Exhibition Space
          </p>
          <p className="text-center text-sm text-slate-500 mb-8">Live booth prices and availability</p>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {[1, 2, 3].map((item) => <div key={item} className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />)}
            </div>
          ) : error || tiers.length === 0 ? (
            <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-slate-600">Booth availability is temporarily unavailable.</p>
              <Link href="/booths" className="mt-3 inline-flex items-center gap-2 font-semibold text-[#1E4D38] hover:underline">View booth options <ArrowRight className="h-4 w-4" /></Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {tiers.slice(0, 3).map((tier) => {
                const unavailable = tier.isLocked || tier.stock <= 0;
                return (
                  <article key={tier.id} className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{tier.dimension}</p>
                        <h3 className="mt-1 font-heading text-xl font-bold text-slate-900">{tier.name}</h3>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${unavailable ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-800'}`}>
                        {tier.isLocked ? 'Paused' : tier.stock <= 0 ? 'Sold out' : `${tier.stock} available`}
                      </span>
                    </div>
                    <p className="font-heading text-2xl font-black text-[#153627]">{formatNaira(tier.price)}</p>
                    <p className="mt-1 text-xs text-slate-500">Base space rate</p>
                    <ul className="mt-5 flex-1 space-y-2 border-t border-slate-100 pt-4">
                      {tier.perks.slice(0, 3).map((perk, index) => (
                        <li key={`${tier.id}-perk-${index}`} className="flex items-start gap-2 text-sm leading-5 text-slate-600">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1E4D38]" />{perk}
                        </li>
                      ))}
                      {tier.perks.length === 0 && <li className="text-sm text-slate-500">See full booth details and inclusions.</li>}
                    </ul>
                    <Link href="/booths" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#1E4D38] hover:underline">
                      See booth details <ArrowRight className="h-4 w-4" />
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
