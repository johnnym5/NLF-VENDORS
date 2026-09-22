'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MapPin, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/lib/auth';
import { useVendorOrders, purchaseBoothTransaction } from '@/lib/firestore';
import { formatNaira } from '@/lib/design-tokens';
import { FadeIn } from '@/components/ui/FadeIn';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';

function PermitContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  const { user, loading: authLoading, signOutUser } = useAuth();
  const { orders, loading: ordersLoading } = useVendorOrders(user?.uid || '');

  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [activeOrderIndex, setActiveOrderIndex] = useState<number | null>(null);

  useEffect(() => {
    if (orders.length > 0 && activeOrderIndex === null) {
      setActiveOrderIndex(orders.length - 1);
    }
  }, [orders, activeOrderIndex]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/booths');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fulfillOrder() {
      if (!sessionId || !user || ordersLoading) return;

      setVerifying(true);
      try {
        const res = await fetch(`/api/checkout/verify?session_id=${sessionId}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Payment verification failed');
        }

        const { metadata, paymentReference } = data;

        // Check if this order is already in the list
        const orderAlreadySaved = orders.some(o => o.paymentReference === paymentReference);

        if (!orderAlreadySaved) {
          await purchaseBoothTransaction(
            user.uid,
            {
              orgName: metadata.orgName,
              contactPerson: metadata.contactPerson,
              phone: metadata.phone,
              sector: metadata.sector,
              email: metadata.email || user.email || '',
            },
            metadata.tierId,
            paymentReference
          );
        }

        // Clean URL query parameters
        router.replace('/booths/permit');
      } catch (err: any) {
        console.error('Fulfillment error:', err);
        setVerificationError(err.message || 'Failed to verify payment');
      } finally {
        setVerifying(false);
      }
    }

    fulfillOrder();
  }, [sessionId, user, ordersLoading, orders, router]);

  const handleSignOut = async () => {
    await signOutUser();
    router.push('/booths');
  };

  if (authLoading || ordersLoading || verifying) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FBFBFA] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
        {verifying && <p className="text-sm text-slate-600 font-medium">Verifying payment and generating permit...</p>}
      </div>
    );
  }

  if (verificationError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBFA] p-6">
        <div className="max-w-md w-full">
          <Alert variant="error" className="shadow-sm border-2">
            <h3 className="font-semibold text-red-800 mb-1">Payment Verification Failed</h3>
            <p className="text-sm text-red-700">{verificationError}</p>
            <Button onClick={() => router.push('/booths')} className="mt-4 w-full">
              Return to Storefront
            </Button>
          </Alert>
        </div>
      </div>
    );
  }

  if (!user || orders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBFA] flex-col space-y-4">
        <p className="text-slate-600">No active permits found.</p>
        <Button onClick={() => router.push('/booths')}>Browse Booths</Button>
      </div>
    );
  }

  // Display selected or latest order
  const order = activeOrderIndex !== null && orders[activeOrderIndex] ? orders[activeOrderIndex] : orders[orders.length - 1];
  const isRevoked = order.status === 'REVOKED';
  const isPending = order.assignedBoothNumber === 'Pending Assignment';

  return (
    <div className="min-h-screen bg-[#FBFBFA] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">

        {/* Additional Booth Call to Action */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-center bg-white p-5 rounded-xl border border-slate-200/70 shadow-sm gap-4">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Need another exhibition space?</h3>
            <p className="text-xs text-slate-500 mt-0.5">You can reserve additional booths across any available tier.</p>
          </div>
          <Button onClick={() => router.push('/booths')} size="sm" className="w-full sm:w-auto bg-[#1E4D38] hover:bg-[#153627] text-white">
            + Book Additional Booth
          </Button>
        </div>

        {/* Multi-Booth Tab Selector */}
        {orders.length > 1 && (
          <div className="mb-6 bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm">
            <span className="text-[11px] text-slate-400 block text-center font-bold uppercase tracking-wider mb-2">
              Your Exhibition Booths ({orders.length})
            </span>
            <div className="flex flex-wrap gap-2 justify-center">
              {orders.map((o, idx) => (
                <button
                  key={o.id}
                  onClick={() => setActiveOrderIndex(idx)}
                  className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-all border ${
                    idx === (activeOrderIndex ?? orders.length - 1)
                      ? 'bg-slate-900 text-white font-bold border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200/60'
                  }`}
                >
                  {o.id} ({o.assignedBoothNumber === 'Pending Assignment' ? 'Pending' : o.assignedBoothNumber})
                </button>
              ))}
            </div>
          </div>
        )}

        {isRevoked && (
          <FadeIn delay={0}>
            <Alert variant="error" className="mb-6 shadow-sm border-2">
              Booth Allocation Revoked. Your exhibition permit has been suspended by the Secretariat Committee. Please visit the Accreditation Desk at the Federal Ministry of Livestock Development headquarters in Abuja or contact exhibit@carnival.ng.
            </Alert>
          </FadeIn>
        )}

        <FadeIn delay={150}>
          <div className={`bg-white rounded-xl border border-slate-200/70 shadow-sm overflow-hidden ${isRevoked ? 'opacity-60 grayscale' : ''}`}>
            
            {/* Header Section */}
            <div className="p-8 border-b border-slate-100 text-center relative">
              <p className="text-sm text-slate-500 uppercase tracking-wider mb-1">
                National Livestock Festival 2026
              </p>
              <h1 className="text-2xl font-heading font-bold text-slate-900 mb-2">
                Exhibition Permit
              </h1>
              <div className="flex items-center justify-center gap-2 mb-6">
                <span className="text-sm font-bold text-[#1E4D38] bg-[#E8F3ED] px-3 py-1 rounded-lg">
                  Vendor #{order.vendorSequence || 'N/A'}
                </span>
              </div>

              <div className="bg-slate-50 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-heading font-bold text-slate-900 mb-4">
                  {order.orgName}
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-slate-600">
                  <div>
                    <span className="block text-slate-400 text-xs mb-1">Contact</span>
                    <span className="font-medium text-slate-800">{order.contactPerson}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 text-xs mb-1">Email</span>
                    <span className="font-medium text-slate-800">{order.email}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 text-xs mb-1">Phone</span>
                    <span className="font-medium text-slate-800">{order.phone}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-center items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <Badge variant={order.tierName.toLowerCase().includes('sage') ? 'sage' : order.tierName.toLowerCase().includes('champagne') ? 'champagne' : 'slate'}>
                  {order.tierName}
                </Badge>
                <span className="text-sm font-mono text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  {order.id}
                </span>
              </div>
            </div>

            {/* Booth Allocation Section */}
            <div className="p-8 border-b border-slate-100">
              {isPending ? (
                <div>
                  <Alert variant="warning" className="mb-4">
                    Your physical booth location is pending assignment by the Secretariat Committee. You will be notified once allocated.
                  </Alert>
                  <div className="bg-[#FAF6EC] border border-[#E8D7B0] rounded-lg p-4 text-center">
                    <span className="text-[#8D6B1B] font-medium">Pending Assignment</span>
                  </div>
                </div>
              ) : (
                <div className="bg-[#DCFCE7] border border-[#86EFAC] rounded-xl p-8 text-center flex flex-col items-center justify-center">
                  <MapPin className="w-8 h-8 text-[#166534] mb-2" />
                  <span className="text-[#166534] font-medium mb-1">Assigned Physical Location</span>
                  <span className="text-3xl font-mono font-bold text-[#166534]">
                    {order.assignedBoothNumber}
                  </span>
                </div>
              )}
            </div>

            {/* QR Code Section */}
            <div className="p-8 border-b border-slate-100 flex flex-col items-center justify-center">
              <div className="relative">
                <QRCodeSVG
                  value={`ORDER:${order.id}|ORG:${order.orgName}|BOOTH:${order.assignedBoothNumber}|STATUS:${order.status}`}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
                {isRevoked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                    <span className="text-3xl font-bold text-red-600 rotate-[-15deg] border-4 border-red-600 px-4 py-1 rounded">
                      VOID
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-4 text-center max-w-xs">
                Scan at Abuja Gate 3 (Commercial Deliveries)
              </p>
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 flex flex-col sm:flex-row justify-between items-center text-sm text-slate-500 space-y-4 sm:space-y-0">
              <div>
                <span className="block">Amount Paid: {formatNaira(order.pricePaid)}</span>
                <span className="block">Purchased: {new Date(order.purchasedAt).toLocaleDateString()}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}

export default function PermitPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FBFBFA]">
          <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
        </div>
      }
    >
      <PermitContent />
    </React.Suspense>
  );
}
