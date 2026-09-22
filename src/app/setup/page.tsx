'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { FadeIn } from '@/components/ui/FadeIn';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Loader2, CheckCircle, Database, ArrowLeft } from 'lucide-react';

const SEED_TIERS = [
  {
    id: 'tier_standard',
    data: {
      id: 'tier_standard',
      name: 'Standard Meat and Agro Stall',
      dimension: '3m x 3m Demarcated Stall',
      colorCode: 'sage',
      price: 150000,
      stock: 20,
      initialStock: 20,
      isLocked: false,
      perks: [
        'Demarcated floor space (3m x 3m)',
        'Basic signage holder',
        'Access to shared cold storage',
        'Festival programme listing',
        'Standard exhibitor badge (x2)',
      ],
      updatedAt: new Date().toISOString(),
    },
  },
  {
    id: 'tier_culinary',
    data: {
      id: 'tier_culinary',
      name: 'Premium Culinary and Pavilion',
      dimension: '6m x 3m Covered Pavilion',
      colorCode: 'champagne',
      price: 300000,
      stock: 15,
      initialStock: 15,
      isLocked: false,
      perks: [
        'Covered pavilion space (6m x 3m)',
        'Dedicated power outlet (13A)',
        'Premium signage and branding',
        'Priority cold storage access',
        'VIP exhibitor badge (x4)',
        'Festival catalogue feature',
      ],
      updatedAt: new Date().toISOString(),
    },
  },
  {
    id: 'tier_corporate',
    data: {
      id: 'tier_corporate',
      name: 'Corporate and Machinery Island',
      dimension: '9m x 6m Island Plot',
      colorCode: 'slate',
      price: 500000,
      stock: 10,
      initialStock: 10,
      isLocked: false,
      perks: [
        'Premium island plot (9m x 6m)',
        'Heavy machinery access lane',
        'Dedicated power supply (30A)',
        'Custom branding and signage package',
        'Private meeting area',
        'All-access exhibitor badge (x8)',
        'Sponsored feature in festival media',
      ],
      updatedAt: new Date().toISOString(),
    },
  },
];

export default function SetupPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAdmin, signInWithGoogle, signInWithEmail } = useAuth();

  const [setupEmail, setSetupEmail] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [step, setStep] = useState<'auth' | 'ready' | 'seeding' | 'done' | 'exists'>('auth');
  const [error, setError] = useState<string | null>(null);
  const [seededCount, setSeededCount] = useState(0);

  useEffect(() => {
    if (!authLoading && user) {
      // Check if tiers already exist
      checkExistingData();
    }
  }, [user, authLoading]);

  const checkExistingData = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'booth_tiers'));
      if (snapshot.size > 0) {
        setStep('exists');
      } else {
        setStep('ready');
      }
    } catch {
      // Collection doesn't exist yet — ready to seed
      setStep('ready');
    }
  };

  const handleSeed = async () => {
    setStep('seeding');
    setError(null);
    setSeededCount(0);

    try {
      for (const tier of SEED_TIERS) {
        await setDoc(doc(db, 'booth_tiers', tier.id), tier.data, { merge: true });
        setSeededCount((prev) => prev + 1);
      }
      setStep('done');
    } catch (err: any) {
      setError(
        err.message?.includes('PERMISSION_DENIED')
          ? 'Permission denied. You need admin privileges to seed data. Make sure you have run the set-admin-claim script for your account first.'
          : err.message || 'Failed to seed data'
      );
      setStep('ready');
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBFA]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col items-center justify-center px-4 py-12">
      <FadeIn>
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-8">
            <div className="flex items-center justify-center mb-6">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                <Database className="w-6 h-6 text-slate-600" />
              </div>
            </div>

            <h1 className="text-2xl font-heading font-bold text-slate-900 text-center mb-2">
              First-Time Setup
            </h1>
            <p className="text-sm text-slate-500 text-center mb-8">
              Initialize the booth tiers in your Firestore database.
            </p>

            {error && (
              <Alert variant="error" className="mb-6">
                {error}
              </Alert>
            )}

            {/* Step: Auth */}
            {!user && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600 text-center">
                  Sign in with your administrator account (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded">admin@nlf.com</code>) to initialize the database.
                </p>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setError(null);
                    try {
                      await signInWithEmail(setupEmail, setupPassword);
                    } catch (err: any) {
                      setError(err.message || 'Login failed');
                    }
                  }}
                  className="space-y-3"
                >
                  <input
                    type="email"
                    placeholder="Admin Email (e.g. admin@nlf.com)"
                    value={setupEmail}
                    onChange={(e) => setSetupEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={setupPassword}
                    onChange={(e) => setSetupPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    required
                  />
                  <Button type="submit" className="w-full">
                    Sign In with Email
                  </Button>
                </form>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white text-slate-400">or</span>
                  </div>
                </div>

                <Button onClick={handleGoogleSignIn} variant="outline" className="w-full">
                  Sign In with Google
                </Button>
              </div>
            )}

            {/* Step: Already exists */}
            {step === 'exists' && (
              <div className="text-center space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-green-800 font-medium">
                    Booth tiers already exist in the database.
                  </p>
                </div>
                <Button onClick={() => router.push('/booths')} className="w-full">
                  Go to Booth Storefront
                </Button>
              </div>
            )}

            {/* Step: Ready to seed */}
            {step === 'ready' && user && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Signed in as <span className="font-medium text-slate-900">{user.email}</span>
                  {isAdmin && <span className="text-green-600 ml-1">(Admin)</span>}
                </p>

                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <p className="text-sm font-medium text-slate-700 mb-3">This will create:</p>
                  <ul className="text-sm text-slate-600 space-y-2">
                    {SEED_TIERS.map((tier) => (
                      <li key={tier.id} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        {tier.data.name} — {tier.data.stock} stalls
                      </li>
                    ))}
                  </ul>
                </div>

                {!isAdmin && (
                  <Alert variant="warning">
                    Your account does not have admin privileges. Seeding may fail due to Firestore
                    security rules. Run <code className="text-xs">node scripts/set-admin-claim.js {user.email}</code> first.
                  </Alert>
                )}

                <Button onClick={handleSeed} className="w-full">
                  Seed Booth Tiers
                </Button>
              </div>
            )}

            {/* Step: Seeding in progress */}
            {step === 'seeding' && (
              <div className="text-center space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-slate-500 mx-auto" />
                <p className="text-sm text-slate-600">
                  Seeding tier {seededCount + 1} of {SEED_TIERS.length}...
                </p>
              </div>
            )}

            {/* Step: Done */}
            {step === 'done' && (
              <div className="text-center space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-green-800 font-medium">
                    All {SEED_TIERS.length} booth tiers seeded successfully!
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => router.push('/booths')} className="flex-1">
                    View Storefront
                  </Button>
                  <Button onClick={() => router.push('/admin/booths')} variant="outline" className="flex-1">
                    Admin Dashboard
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
