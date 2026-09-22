'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { CheckCircle, Loader2, CreditCard, Landmark, PhoneCall } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTiers, purchaseBoothTransaction, useVendorOrders } from '@/lib/firestore';
import { formatNaira } from '@/lib/design-tokens';
import { FadeIn } from '@/components/ui/FadeIn';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SECTORS } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';

type Step = 'auth' | 'profile' | 'business_details' | 'confirm' | 'complete';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tierId, setTierId] = useState<string | null>(null);
  const [checkingTier, setCheckingTier] = useState(true);
  
  const { user, loading: authLoading, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const { tiers, loading: tiersLoading } = useTiers();
  const { orders: existingOrders } = useVendorOrders(user?.uid || undefined);

  useEffect(() => {
    const nextTier = searchParams.get('tier');
    if (nextTier) {
      setTierId(nextTier);
      setCheckingTier(false);
    } else if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const winTier = urlParams.get('tier');
      if (winTier) {
        setTierId(winTier);
        setCheckingTier(false);
      } else {
        router.push('/booths');
      }
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (user && existingOrders && existingOrders.length > 0 && formData.orgName === '') {
      const latestOrder = existingOrders[existingOrders.length - 1];
      setFormData({
        orgName: latestOrder.orgName || '',
        contactPerson: latestOrder.contactPerson || '',
        phone: latestOrder.phone || '',
        sector: latestOrder.sector || '',
        website: latestOrder.website || '',
        businessDescription: latestOrder.businessDescription || ''
      });
    }
  }, [user, existingOrders]);

  const [step, setStep] = useState<Step>('auth');
  const [formData, setFormData] = useState<{
    orgName: string;
    contactPerson: string;
    phone: string;
    sector: string;
    website: string;
    businessDescription: string;
  }>({
    orgName: '',
    contactPerson: '',
    phone: '',
    sector: '',
    website: '',
    businessDescription: ''
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
      const savedOrg = typeof window !== 'undefined' ? localStorage.getItem(`nlf_org_${user.uid}`) : null;
      setFormData(prev => ({
        ...prev,
        orgName: prev.orgName || savedOrg || (user.displayName && !user.displayName.includes(' ') ? user.displayName : ''),
        contactPerson: prev.contactPerson || user.displayName || ''
      }));
    }
  }, [user, step]);

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
    if (authMode === 'signup' && !signupOrgName.trim()) {
      setError('Please enter your Organization / Company Name');
      return;
    }
    setError(null);
    try {
      if (authMode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, signupOrgName.trim());
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    }
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.orgName || !formData.contactPerson || !formData.phone || !formData.sector) {
      setError('Please fill out all fields');
      return;
    }
    setError(null);
    setStep('business_details');
  };

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'options' | 'processing' | 'success' | 'failed'>('options');
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'transfer' | 'ussd'>('card');
  const [paymentProgress, setPaymentProgress] = useState(0);

  const handleConfirm = () => {
    if (!user || !selectedTier) return;
    setError(null);
    setShowPaymentModal(true);
    setPaymentStep('options');
  };

  const executeMockPayment = async () => {
    if (!user || !selectedTier) return;
    setPaymentStep('processing');
    setPaymentProgress(15);

    // Animate custom high-trust simulation progress bar loading intervals
    const interval = setInterval(() => {
      setPaymentProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 25;
      });
    }, 400);

    try {
      // Simulate secure transaction network buffer delay
      await new Promise(resolve => setTimeout(resolve, 1600));
      clearInterval(interval);
      setPaymentProgress(100);

      // Perform local reliable transactional write directly to Firebase Firestore
      const generatedMockRef = 'NLF-TX-' + Math.random().toString(36).substring(2, 11).toUpperCase();
      await purchaseBoothTransaction(
        user.uid,
        {
          orgName: formData.orgName,
          contactPerson: formData.contactPerson,
          phone: formData.phone,
          sector: formData.sector,
          website: formData.website,
          businessDescription: formData.businessDescription,
          email: user.email || ''
        },
        selectedTier.id,
        generatedMockRef
      );

      setPaymentStep('success');

      // Auto-transition to final success screen after successful completion
      setTimeout(() => {
        setShowPaymentModal(false);
        setStep('complete');
        setTimeout(() => {
          router.push('/booths/permit');
        }, 1500);
      }, 1200);

    } catch (err: any) {
      clearInterval(interval);
      setPaymentStep('failed');
      setError(err.message || 'Mock processing validation failed to record booth allocation reservation.');
    }
  };

  if (authLoading || tiersLoading || checkingTier) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBFA]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!selectedTier) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-[#FBFBFA] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto">
        <div className="mb-8 flex justify-center items-center space-x-3 text-xs md:text-sm font-medium">
          <span className={step === 'auth' ? 'text-slate-900 font-semibold' : 'text-slate-400'}>1. Auth</span>
          <span className="text-slate-300">/</span>
          <span className={step === 'profile' ? 'text-slate-900 font-semibold' : 'text-slate-400'}>2. Profile</span>
          <span className="text-slate-300">/</span>
          <span className={step === 'business_details' ? 'text-slate-900 font-semibold' : 'text-slate-400'}>3. Details</span>
          <span className="text-slate-300">/</span>
          <span className={step === 'confirm' ? 'text-slate-900 font-semibold' : 'text-slate-400'}>4. Confirm</span>
        </div>

        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        {step === 'auth' && (
          <FadeIn>
            <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-8">
              <h1 className="text-2xl font-heading font-bold text-slate-900 mb-6 text-center">
                Exhibitor Authentication
              </h1>
              
              <Button onClick={handleGoogleSignIn} variant="outline" className="w-full mb-6 flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </Button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-slate-500">or</span>
                </div>
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-4">
                {authMode === 'signup' && (
                  <Input
                    label="Organization / Company Name"
                    type="text"
                    placeholder="e.g. Apex Agri Solutions"
                    value={signupOrgName}
                    onChange={(e) => setSignupOrgName(e.target.value)}
                    required
                  />
                )}
                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button type="submit" className="w-full">
                  {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                </Button>
              </form>
              
              <div className="mt-4 text-center text-sm text-slate-500">
                {authMode === 'signin' ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  className="text-slate-900 font-medium hover:underline"
                  onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                >
                  {authMode === 'signin' ? 'Sign Up' : 'Sign In'}
                </button>
              </div>
            </div>
          </FadeIn>
        )}

        {step === 'profile' && (
          <FadeIn>
            <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-8">
              <h1 className="text-2xl font-heading font-bold text-slate-900 mb-2">
                Exhibitor Profile
              </h1>
              <p className="text-slate-500 text-sm mb-6">
                Logged in as {user?.email}
              </p>

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <Input
                  label="Organization / Company Name"
                  value={formData.orgName}
                  onChange={(e) => setFormData(prev => ({ ...prev, orgName: e.target.value }))}
                  required
                />
                <Input
                  label="Contact Representative Full Name"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                  required
                />
                <Input
                  label="Direct Telephone Number"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  required
                />
                <Input
                  label="I SELL (Industry Sector):"
                  value={formData.sector}
                  onChange={(e) => setFormData(prev => ({ ...prev, sector: e.target.value }))}
                  placeholder="e.g. Halal Culinary, Live Breeding, Fresh Meat"
                  required
                />
                <div className="pt-4 flex justify-between">
                  <Button type="button" variant="outline" onClick={() => router.push('/booths')}>
                    Back
                  </Button>
                  <Button type="submit">
                    Continue
                  </Button>
                </div>
              </form>
            </div>
          </FadeIn>
        )}

        {step === 'business_details' && (
          <FadeIn>
            <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-8">
              <h2 className="text-xl font-heading font-semibold text-slate-900 mb-2">
                Describe your business in a few words.
              </h2>
              <p className="text-slate-500 text-sm mb-6">
                This helps us recommend the best setup.
              </p>

              <div className="space-y-5">
                <Input
                  label="Website"
                  placeholder="NLF-VENDOR.WEB.APP"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                />

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                    What does your business do?
                  </label>
                  <textarea
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-300 focus:outline-none focus:ring-2 focus:border-[#B8D8C5] focus:ring-[#B8D8C5]/20 min-h-[120px]"
                    placeholder="WE SELL VENDOR SPACE FOR A CARNIVAL EVENT"
                    value={formData.businessDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessDescription: e.target.value }))}
                  />
                </div>

                <div className="pt-4 flex justify-between items-center border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={() => setStep('profile')}>
                    &larr; Back
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, website: '', businessDescription: '' }));
                        setStep('confirm');
                      }}
                    >
                      Skip
                    </Button>
                    <Button type="button" onClick={() => setStep('confirm')}>
                      Continue
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        )}

        {step === 'confirm' && (
          <FadeIn>
            <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-8">
              <h1 className="text-2xl font-heading font-bold text-slate-900 mb-6">
                Confirm Reservation
              </h1>
              
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 mb-6">
                <h3 className="font-semibold text-slate-900 mb-4">Tier Summary</h3>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-500">Tier</span>
                  <span className="font-medium">{selectedTier.name}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-500">Dimension</span>
                  <span className="font-medium font-mono text-sm">{selectedTier.dimension}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 mt-2">
                  <span className="text-slate-500 font-medium">Total Price</span>
                  <span className="font-bold text-lg">{formatNaira(selectedTier.price)}</span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 mb-6">
                <h3 className="font-semibold text-slate-900 mb-4">Organization Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500">Organization:</span>
                    <span className="col-span-2 font-medium">{formData.orgName}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500">Contact:</span>
                    <span className="col-span-2 font-medium">{formData.contactPerson}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500">Phone:</span>
                    <span className="col-span-2 font-medium">{formData.phone}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500">I SELL:</span>
                    <span className="col-span-2 font-medium">{formData.sector}</span>
                  </div>
                  {formData.website && (
                    <div className="grid grid-cols-3">
                      <span className="text-slate-500">Website:</span>
                      <span className="col-span-2 font-medium text-slate-700">{formData.website}</span>
                    </div>
                  )}
                  {formData.businessDescription && (
                    <div className="grid grid-cols-3">
                      <span className="text-slate-500">Description:</span>
                      <span className="col-span-2 font-medium text-slate-700">{formData.businessDescription}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setStep('business_details')}>
                  Back
                </Button>
                <Button onClick={handleConfirm}>
                  Confirm Reservation and Pay
                </Button>
              </div>
            </div>
          </FadeIn>
        )}

        <Modal
          isOpen={showPaymentModal}
          onClose={() => paymentStep !== 'processing' && setShowPaymentModal(false)}
          title="NLF Official Payment Secretariat"
          size="md"
        >
          {paymentStep === 'options' && (
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Amount Due</p>
                  <p className="text-2xl font-black text-slate-900 font-heading">{formatNaira(selectedTier.price)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Exhibition Space</p>
                  <p className="text-sm font-semibold text-[#1E4D38]">{selectedTier.name}</p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide block mb-1">Select Payment Channels</label>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('card')}
                  className={`w-full flex items-center justify-between p-4 border rounded-xl text-left transition-all ${
                    selectedMethod === 'card'
                      ? 'border-[#1E4D38] bg-[#1E4D38]/5 ring-1 ring-[#1E4D38]'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${selectedMethod === 'card' ? 'bg-[#1E4D38] text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Pay via Commercial Debit Card</p>
                      <p className="text-xs text-slate-500">Supports Visa, Verve, Mastercard instantly</p>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMethod === 'card' ? 'border-[#1E4D38]' : 'border-slate-300'}`}>
                    {selectedMethod === 'card' && <div className="w-2 h-2 rounded-full bg-[#1E4D38]" />}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('transfer')}
                  className={`w-full flex items-center justify-between p-4 border rounded-xl text-left transition-all ${
                    selectedMethod === 'transfer'
                      ? 'border-[#1E4D38] bg-[#1E4D38]/5 ring-1 ring-[#1E4D38]'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${selectedMethod === 'transfer' ? 'bg-[#1E4D38] text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <Landmark size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Instant Core Bank Transfer</p>
                      <p className="text-xs text-slate-500">Automated allocation checkout confirmation</p>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMethod === 'transfer' ? 'border-[#1E4D38]' : 'border-slate-300'}`}>
                    {selectedMethod === 'transfer' && <div className="w-2 h-2 rounded-full bg-[#1E4D38]" />}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('ussd')}
                  className={`w-full flex items-center justify-between p-4 border rounded-xl text-left transition-all ${
                    selectedMethod === 'ussd'
                      ? 'border-[#1E4D38] bg-[#1E4D38]/5 ring-1 ring-[#1E4D38]'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${selectedMethod === 'ussd' ? 'bg-[#1E4D38] text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <PhoneCall size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">USSD Code Automation QuickString</p>
                      <p className="text-xs text-slate-500">Dial securely via linked banking hardware</p>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMethod === 'ussd' ? 'border-[#1E4D38]' : 'border-slate-300'}`}>
                    {selectedMethod === 'ussd' && <div className="w-2 h-2 rounded-full bg-[#1E4D38]" />}
                  </div>
                </button>
              </div>

              <div className="pt-4 flex gap-3 border-t border-slate-100">
                <Button variant="outline" className="flex-1" onClick={() => setShowPaymentModal(false)}>
                  Cancel
                </Button>
                <Button className="flex-1 bg-[#1E4D38] hover:bg-[#133325] text-white" onClick={executeMockPayment}>
                  Authorize Secure Payment
                </Button>
              </div>
            </div>
          )}

          {paymentStep === 'processing' && (
            <div className="py-8 text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-[#1E4D38] mx-auto" />
              <div className="space-y-1">
                <p className="font-heading font-bold text-slate-900 text-lg">Verifying Secretariat Remittance...</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">Connecting to local Central Bank settlement nodes. Please do not close this modal box or reload the view.</p>
              </div>
              <div className="max-w-xs mx-auto bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#1E4D38] h-full transition-all duration-300 rounded-full"
                  style={{ width: `${paymentProgress}%` }}
                />
              </div>
            </div>
          )}

          {paymentStep === 'success' && (
            <div className="py-8 text-center space-y-3">
              <div className="w-14 h-14 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={32} />
              </div>
              <p className="font-heading font-bold text-slate-900 text-xl">Remittance Authenticated</p>
              <p className="text-sm text-slate-500 max-w-xs mx-auto">Your festival booth procurement allocation record has been successfully recorded in the registry.</p>
            </div>
          )}
        </Modal>

        {step === 'complete' && (
          <FadeIn>
            <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-heading font-bold text-slate-900 mb-2">
                Reservation Successful
              </h1>
              <p className="text-slate-500">
                Redirecting to your digital permit...
              </p>
            </div>
          </FadeIn>
        )}
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FBFBFA]">
          <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
        </div>
      }
    >
      <CheckoutContent />
    </React.Suspense>
  );
}
