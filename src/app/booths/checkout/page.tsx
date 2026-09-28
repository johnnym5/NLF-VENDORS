'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Loader2, Info, Send, FileText, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTiers, useVendorReservations, saveBoothReservation } from '@/lib/supabase-queries';
import { formatNaira } from '@/lib/design-tokens';
import { FadeIn } from '@/components/ui/FadeIn';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Step = 'auth' | 'profile' | 'custom_requests' | 'confirm' | 'complete';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tierId, setTierId] = useState<string | null>(null);

  const { user, loading: authLoading, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const { tiers, loading: tiersLoading } = useTiers();
  const { reservations: existingReservations } = useVendorReservations(user?.uid || undefined);

  useEffect(() => {
    const nextTier = searchParams.get('tier');
    if (nextTier) {
      setTierId(nextTier);
    } else if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const winTier = urlParams.get('tier');
      if (winTier) {
        setTierId(winTier);
      } else {
        router.push('/booths');
      }
    }
  }, [searchParams, router]);

  const [step, setStep] = useState<Step>('auth');
  const [formData, setFormData] = useState({
    orgName: '',
    contactPerson: '',
    phone: '',
    sector: '', // Represents "What I sell:"
    website: '',
    businessDescription: '',
    customRequestText: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [signupOrgName, setSignupOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (user && step === 'auth') {
      setStep('profile');
      setFormData(prev => ({
        ...prev,
        orgName: prev.orgName || user.orgName || user.displayName || '',
        contactPerson: prev.contactPerson || user.displayName || ''
      }));
    }
  }, [user, step]);

  // Pre-fill profile if existing reservation exists
  useEffect(() => {
    if (user && existingReservations && existingReservations.length > 0) {
      const latest = existingReservations[existingReservations.length - 1];
      if (latest.profile) {
        setFormData(prev => ({
          ...prev,
          orgName: prev.orgName || latest.profile?.orgName || '',
          contactPerson: prev.contactPerson || latest.profile?.contactPerson || '',
          phone: prev.phone || latest.profile?.phone || '',
          sector: prev.sector || latest.profile?.sector || '',
          website: prev.website || latest.profile?.website || '',
          businessDescription: prev.businessDescription || latest.profile?.businessDescription || '',
        }));
      }
    }
  }, [user, existingReservations]);

  const selectedTier = tiers.find(t => t.id === tierId);

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (authMode === 'signup') {
        await signUpWithEmail(email, password, { orgName: signupOrgName });
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    }
  };

  const handleSaveSpace = async () => {
    if (!user || !selectedTier) return;
    setSubmitting(true);
    setError(null);

    try {
      await saveBoothReservation(
        user.id,
        selectedTier.id,
        {
          orgName: formData.orgName,
          contactPerson: formData.contactPerson,
          phone: formData.phone,
          sector: formData.sector || 'General Goods & Services',
          email: user.email,
          website: formData.website,
          businessDescription: formData.businessDescription,
        },
        formData.customRequestText,
        'RESERVED_PENDING_APPROVAL'
      );

      setStep('complete');
      setTimeout(() => {
        router.push('/booths/permit');
      }, 1200);
    } catch (err: any) {
      console.error('Failed to save space:', err);
      setError(err.message || 'Failed to save space reservation');
      setSubmitting(false);
    }
  };

  if (authLoading || tiersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBFA]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!selectedTier) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBFA] p-4">
        <div className="text-center">
          <p className="text-slate-600 mb-4">No tier selected or tier not found.</p>
          <Button onClick={() => router.push('/booths')}>Browse Exhibition Booths</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFA] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/booths')}
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Booth Catalog
        </Button>

        {/* Selected Tier Summary Banner */}
        <div className="bg-white rounded-xl border border-slate-200/70 p-6 mb-8 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">
              Selected Exhibition Space
            </span>
            <h2 className="text-xl font-heading font-bold text-slate-900">{selectedTier.name}</h2>
            <p className="text-sm text-slate-500">{selectedTier.dimension}</p>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-2xl font-bold text-slate-900">{formatNaira(selectedTier.price)}</span>
            <span className="block text-xs text-slate-500">Base Space Rate</span>
          </div>
        </div>

        <FadeIn>
          <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-8">
            {error && (
              <Alert variant="error" className="mb-6">
                {error}
              </Alert>
            )}

            {/* STEP 1: AUTHENTICATION */}
            {step === 'auth' && !user && (
              <div>
                <h3 className="text-lg font-heading font-semibold text-slate-900 mb-2">
                  Vendor Authentication
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                  Sign in or create a vendor account to reserve your space and submit custom requests.
                </p>

                <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
                  {authMode === 'signup' && (
                    <Input
                      label="Organization / Business Name"
                      placeholder="e.g. Premium Agrotech Ltd"
                      value={signupOrgName}
                      onChange={(e) => setSignupOrgName(e.target.value)}
                      required
                    />
                  )}
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="vendor@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <Input
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button type="submit" className="w-full">
                    {authMode === 'signin' ? 'Sign In & Continue' : 'Create Vendor Account'}
                  </Button>
                </form>

                <div className="text-center text-xs text-slate-500 mb-4">
                  {authMode === 'signin' ? (
                    <p>
                      Don&apos;t have an account?{' '}
                      <button
                        onClick={() => setAuthMode('signup')}
                        className="text-slate-900 font-semibold underline"
                      >
                        Sign Up
                      </button>
                    </p>
                  ) : (
                    <p>
                      Already registered?{' '}
                      <button
                        onClick={() => setAuthMode('signin')}
                        className="text-slate-900 font-semibold underline"
                      >
                        Sign In
                      </button>
                    </p>
                  )}
                </div>

                <div className="relative my-6">
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

            {/* STEP 2: PROFILE & INTAKE */}
            {step === 'profile' && (
              <div>
                <h3 className="text-lg font-heading font-semibold text-slate-900 mb-2">
                  Vendor Application & Space Reservation
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                  Provide your organization details. This information will be printed on your digital exhibition pass.
                </p>

                <div className="space-y-4">
                  <Input
                    label="Organization / Company Name *"
                    placeholder="e.g. Premier Livestock Farms Ltd"
                    value={formData.orgName}
                    onChange={(e) => setFormData(prev => ({ ...prev, orgName: e.target.value }))}
                    required
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Contact Person Name *"
                      placeholder="Full Name"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                      required
                    />
                    <Input
                      label="Phone Number *"
                      placeholder="+234 800 000 0000"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Free-form "What I sell:" text field */}
                  <Input
                    label="What I sell: *"
                    placeholder="e.g. Halal Frozen Meat, Vaccines, Agricultural Tractors, Cold Storage, etc."
                    value={formData.sector}
                    onChange={(e) => setFormData(prev => ({ ...prev, sector: e.target.value }))}
                    required
                  />

                  <Input
                    label="Website (Optional)"
                    placeholder="https://company.com"
                    value={formData.website}
                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  />

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Business Overview (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Brief description of products/services to be exhibited..."
                      value={formData.businessDescription}
                      onChange={(e) => setFormData(prev => ({ ...prev, businessDescription: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button
                      onClick={() => {
                        if (!formData.orgName || !formData.contactPerson || !formData.phone || !formData.sector) {
                          setError('Please fill in all required fields marked with *');
                          return;
                        }
                        setError(null);
                        setStep('custom_requests');
                      }}
                    >
                      Next: Custom Booth Requests &rarr;
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: CUSTOM REQUESTS */}
            {step === 'custom_requests' && (
              <div>
                <h3 className="text-lg font-heading font-semibold text-slate-900 mb-2">
                  Special Requirements & Custom Booth Attachments
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                  Do you require extra power drops, specialized cold-chain capacity, heavy equipment access, or custom branding support?
                </p>

                <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-4 mb-6">
                  <div className="flex gap-3">
                    <Info className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Custom requirements are reviewed by the NLF Secretariat. Any itemized surcharges or administrative modifications will be attached to your reservation quote prior to final confirmation.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Custom Booth Request Details (Optional)
                    </label>
                    <textarea
                      rows={4}
                      placeholder="e.g., Require 3-phase 30A power hookup, extra 500L cold storage space, or heavy tractor lane access..."
                      value={formData.customRequestText}
                      onChange={(e) => setFormData(prev => ({ ...prev, customRequestText: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <div className="pt-4 flex justify-between">
                    <Button variant="outline" onClick={() => setStep('profile')}>
                      &larr; Back
                    </Button>
                    <Button onClick={() => setStep('confirm')}>
                      Review Reservation &rarr;
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: CONFIRMATION SUMMARY */}
            {step === 'confirm' && (
              <div>
                <h3 className="text-lg font-heading font-semibold text-slate-900 mb-2">
                  Review & Save Space
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                  Verify your reservation details. Saving your space reserves your allocation and submits your application for Secretariat approval.
                </p>

                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/80 mb-6 space-y-3 text-sm">
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Exhibition Space:</span>
                    <span className="font-semibold text-slate-900">{selectedTier.name} ({selectedTier.dimension})</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Organization:</span>
                    <span className="font-medium text-slate-900">{formData.orgName}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Contact Person:</span>
                    <span className="text-slate-800">{formData.contactPerson} ({formData.phone})</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">What I Sell:</span>
                    <span className="text-slate-800 font-medium">{formData.sector}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Estimated Space Rate:</span>
                    <span className="font-bold text-slate-900">{formatNaira(selectedTier.price)}</span>
                  </div>

                  {formData.customRequestText && (
                    <div className="pt-2">
                      <span className="text-xs font-semibold text-slate-700 block mb-1">Custom Request Submitted:</span>
                      <p className="text-xs text-slate-600 bg-white p-2.5 rounded border border-slate-200 italic">
                        &ldquo;{formData.customRequestText}&rdquo;
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-2">
                  <Button variant="outline" onClick={() => setStep('custom_requests')}>
                    &larr; Back
                  </Button>
                  <Button
                    onClick={handleSaveSpace}
                    disabled={submitting}
                    className="bg-[#1E4D38] hover:bg-[#163827] text-white flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving Space...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Save Space & Submit Application
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 5: COMPLETE */}
            {step === 'complete' && (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-heading font-bold text-slate-900 mb-2">
                  Space Saved Successfully!
                </h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                  Your booth space has been saved and your application submitted to the Secretariat. Redirecting to your Exhibition Pass Dashboard...
                </p>
                <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" />
              </div>
            )}
          </div>
        </FadeIn>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBFA]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
