'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Loader2, Clock, CheckCircle, AlertTriangle, CreditCard, Landmark, PhoneCall, Plus } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/lib/auth';
import { useVendorReservations, updateReservationStatus } from '@/lib/supabase-queries';
import { formatNaira } from '@/lib/design-tokens';
import { FadeIn } from '@/components/ui/FadeIn';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

function PermitContent() {
  const router = useRouter();
  const { user, loading: authLoading, signOutUser } = useAuth();
  const { reservations, loading: resLoading } = useVendorReservations(user?.uid || '');

  const [activeReservationIndex, setActiveReservationIndex] = useState<number | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    if (reservations.length > 0 && activeReservationIndex === null) {
      setActiveReservationIndex(reservations.length - 1);
    }
  }, [reservations, activeReservationIndex]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/booths');
    }
  }, [user, authLoading, router]);

  const handleSignOut = async () => {
    await signOutUser();
    router.push('/booths');
  };

  const executeSettlePayment = async (reservationId: string) => {
    setPaying(true);
    setPaymentError(null);
    try {
      const generatedRef = 'REM-' + Math.random().toString(36).substring(2, 11).toUpperCase();
      await updateReservationStatus(reservationId, 'CONFIRMED_PAID', generatedRef);
      setShowPayModal(false);
    } catch (err: any) {
      setPaymentError(err.message || 'Payment processing failed');
    } finally {
      setPaying(false);
    }
  };

  if (authLoading || resLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FBFBFA] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
        <p className="text-sm text-slate-600 font-medium">Loading digital permit passes...</p>
      </div>
    );
  }

  if (!user || reservations.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBFA] flex-col space-y-4 px-4 text-center">
        <p className="text-slate-600 text-lg font-heading font-medium">No active booth reservations found.</p>
        <p className="text-slate-400 text-sm max-w-sm">Reserve your space at the National Livestock Festival 2026.</p>
        <Button onClick={() => router.push('/booths')} className="bg-[#1E4D38] hover:bg-[#153627] text-white">
          Browse Exhibition Booths
        </Button>
      </div>
    );
  }

  const currentRes = activeReservationIndex !== null && reservations[activeReservationIndex]
    ? reservations[activeReservationIndex]
    : reservations[reservations.length - 1];

  const isPendingApproval = currentRes.status === 'RESERVED_PENDING_APPROVAL' || currentRes.status === 'CART';
  const isApprovedPendingPayment = currentRes.status === 'APPROVED_PENDING_PAYMENT';
  const isConfirmedPaid = currentRes.status === 'CONFIRMED_PAID';
  const isRevoked = currentRes.status === 'REVOKED';

  return (
    <div className="min-h-screen bg-[#FBFBFA] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">

        {/* Action Header Banner */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-center bg-white p-5 rounded-xl border border-slate-200/70 shadow-sm gap-4">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Need another exhibition space?</h3>
            <p className="text-xs text-slate-500 mt-0.5">Reserve additional stalls or pavilions for your business team.</p>
          </div>
          <Button onClick={() => router.push('/booths')} size="sm" className="w-full sm:w-auto bg-[#1E4D38] hover:bg-[#153627] text-white flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Book Additional Booth
          </Button>
        </div>

        {/* Multi-Booth Tab Selector */}
        {reservations.length > 1 && (
          <div className="mb-6 bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm">
            <span className="text-[11px] text-slate-400 block text-center font-bold uppercase tracking-wider mb-2">
              Your Reserved Spaces ({reservations.length})
            </span>
            <div className="flex flex-wrap gap-2 justify-center">
              {reservations.map((res, idx) => (
                <button
                  key={res.id}
                  onClick={() => setActiveReservationIndex(idx)}
                  className={`px-3.5 py-1.5 rounded-lg font-mono text-xs transition-all border ${
                    idx === (activeReservationIndex ?? reservations.length - 1)
                      ? 'bg-slate-900 text-white font-bold border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200/60'
                  }`}
                >
                  {res.referenceId} ({res.assignedBoothNumber === 'Pending Assignment' ? 'Pending' : res.assignedBoothNumber})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Status Alerts */}
        {isPendingApproval && (
          <FadeIn delay={0}>
            <Alert variant="warning" className="mb-6 shadow-sm border border-amber-200 bg-amber-50">
              <div className="flex items-start gap-2 text-amber-900">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Pending Secretariat Approval</h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Your booth space request is currently under review by the Secretariat Committee. Custom requirements and additional fees will be attached upon approval.
                  </p>
                </div>
              </div>
            </Alert>
          </FadeIn>
        )}

        {isApprovedPendingPayment && (
          <FadeIn delay={0}>
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 mb-1">
                    APPROVED BY SECRETARIAT
                  </span>
                  <h4 className="font-bold text-slate-900 text-base">Awaiting Remittance Payment</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Base Rate: <span className="font-semibold">{formatNaira(currentRes.basePrice)}</span>
                    {currentRes.additionalFees > 0 && (
                      <> + Custom Surcharge: <span className="font-semibold">{formatNaira(currentRes.additionalFees)}</span></>
                    )}
                  </p>
                  <p className="text-sm font-bold text-slate-900 mt-1">
                    Total Due: {formatNaira(currentRes.totalAmount)}
                  </p>
                </div>
                <Button
                  onClick={() => setShowPayModal(true)}
                  className="bg-[#1E4D38] hover:bg-[#153627] text-white flex-shrink-0 shadow"
                >
                  Settle Payment ({formatNaira(currentRes.totalAmount)})
                </Button>
              </div>
            </div>
          </FadeIn>
        )}

        {isRevoked && (
          <FadeIn delay={0}>
            <Alert variant="error" className="mb-6 shadow-sm border-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-red-900">Booth Allocation Revoked</h4>
                  <p className="text-xs text-red-700 mt-0.5">
                    Your space allocation permit has been suspended by the Secretariat Committee. Please contact exhibit@carnival.ng or visit the Secretariat Accreditation Desk in Abuja.
                  </p>
                </div>
              </div>
            </Alert>
          </FadeIn>
        )}

        {/* Digital Permit Pass Card */}
        <FadeIn delay={150}>
          <div className={`bg-white rounded-xl border border-slate-200/70 shadow-sm overflow-hidden ${isRevoked ? 'opacity-60 grayscale' : ''}`}>
            
            {/* Header */}
            <div className="p-8 border-b border-slate-100 text-center relative">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1 font-medium">
                Federal Ministry of Livestock Development
              </p>
              <h1 className="text-2xl font-heading font-bold text-slate-900 mb-2">
                Digital Exhibition Pass
              </h1>

              <div className="flex items-center justify-center gap-2 mb-6">
                <span className="text-sm font-bold text-[#1E4D38] bg-[#E8F3ED] px-3 py-1 rounded-lg">
                  Ref: {currentRes.referenceId}
                </span>
                {currentRes.vendorSequence && (
                  <span className="text-sm font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg">
                    Sequence #{currentRes.vendorSequence}
                  </span>
                )}
              </div>

              <div className="bg-slate-50 rounded-lg p-6 mb-6 text-left border border-slate-100">
                <h2 className="text-xl font-heading font-bold text-slate-900 mb-3">
                  {currentRes.profile?.orgName || 'Exhibitor Organization'}
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-slate-600">
                  <div>
                    <span className="block text-slate-400 text-xs mb-0.5">Representative</span>
                    <span className="font-medium text-slate-800">{currentRes.profile?.contactPerson || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 text-xs mb-1">Email</span>
                    <span className="font-medium text-slate-800">{currentRes.profile?.email || user.email}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 text-xs mb-1">Phone</span>
                    <span className="font-medium text-slate-800">{currentRes.profile?.phone || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-center items-center gap-2">
                <Badge variant={currentRes.tierName.toLowerCase().includes('sage') ? 'sage' : currentRes.tierName.toLowerCase().includes('champagne') ? 'champagne' : 'slate'}>
                  {currentRes.tierName}
                </Badge>
                {isConfirmedPaid && <Badge variant="active" className="bg-green-100 text-green-800">Confirmed & Paid</Badge>}
                {isApprovedPendingPayment && <Badge variant="champagne">Approved - Awaiting Payment</Badge>}
                {isPendingApproval && <Badge variant="slate">Pending Approval</Badge>}
                {isRevoked && <Badge variant="revoked">Revoked</Badge>}
              </div>
            </div>

            {/* Custom Requests Breakdown */}
            {currentRes.customRequests && currentRes.customRequests.length > 0 && (
              <div className="p-6 bg-slate-50/70 border-b border-slate-100 text-sm">
                <h4 className="font-semibold text-slate-900 mb-2">Custom Requests & Secretariat Notes</h4>
                <div className="space-y-2">
                  {currentRes.customRequests.map((cr) => (
                    <div key={cr.id} className="bg-white p-3 rounded-lg border border-slate-200/60 text-xs">
                      <p className="font-medium text-slate-800">&ldquo;{cr.requestText}&rdquo;</p>
                      {cr.adminNotes && (
                        <p className="text-slate-500 mt-1">
                          <span className="font-bold text-slate-700">Admin Note:</span> {cr.adminNotes}
                        </p>
                      )}
                      {cr.additionalFee > 0 && (
                        <p className="text-slate-900 font-bold mt-1">
                          Surcharge Attached: {formatNaira(cr.additionalFee)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Booth Physical Location */}
            <div className="p-8 border-b border-slate-100">
              {currentRes.assignedBoothNumber === 'Pending Assignment' ? (
                <div className="bg-[#FAF6EC] border border-[#E8D7B0] rounded-xl p-6 text-center">
                  <span className="block text-[#8D6B1B] font-medium text-sm mb-1">Physical Location Assignment</span>
                  <span className="text-2xl font-bold font-mono text-[#6A5013]">Pending Physical Allocation</span>
                  <p className="text-xs text-[#8D6B1B]/80 mt-2">
                    The Secretariat Committee will assign your physical stall/pavilion location prior to festival check-in.
                  </p>
                </div>
              ) : (
                <div className="bg-[#DCFCE7] border border-[#86EFAC] rounded-xl p-8 text-center flex flex-col items-center justify-center">
                  <MapPin className="w-8 h-8 text-[#166534] mb-2" />
                  <span className="text-[#166534] font-medium mb-1 text-sm">Assigned Physical Location</span>
                  <span className="text-3xl font-mono font-black text-[#166534]">
                    {currentRes.assignedBoothNumber}
                  </span>
                </div>
              )}
            </div>

            {/* QR Code Section */}
            <div className="p-8 border-b border-slate-100 flex flex-col items-center justify-center bg-white">
              <div className="relative p-2 bg-white rounded-xl shadow-sm border border-slate-200">
                <QRCodeSVG
                  value={`REF:${currentRes.referenceId}|ORG:${currentRes.profile?.orgName || ''}|BOOTH:${currentRes.assignedBoothNumber}|STATUS:${currentRes.status}`}
                  size={190}
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
                Scan barcode at Abuja Festival Gate 3 Accreditation Checkpoint
              </p>
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 flex flex-col sm:flex-row justify-between items-center text-sm text-slate-500 gap-4">
              <div>
                <span className="block text-slate-700 font-medium">Total Price: {formatNaira(currentRes.totalAmount)}</span>
                <span className="block text-xs text-slate-400">Created: {new Date(currentRes.createdAt).toLocaleDateString()}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </FadeIn>

        {/* Remittance Payment Settlement Modal */}
        <Modal
          isOpen={showPayModal}
          onClose={() => !paying && setShowPayModal(false)}
          title="Secretariat Remittance Settlement"
          size="md"
        >
          <div className="space-y-6">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Remittance Due</p>
                <p className="text-2xl font-black text-slate-900 font-heading">{formatNaira(currentRes.totalAmount)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Exhibition Space</p>
                <p className="text-sm font-semibold text-[#1E4D38]">{currentRes.tierName}</p>
              </div>
            </div>

            {paymentError && (
              <Alert variant="error">{paymentError}</Alert>
            )}

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide block mb-1">
                Select Settlement Payment Channel
              </label>

              <div className="p-4 border border-[#1E4D38] bg-[#1E4D38]/5 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#1E4D38] text-white">
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Commercial Debit / NIBSS Direct Remittance</p>
                    <p className="text-xs text-slate-500">Instant confirmation & stock allocation</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-3 border-t border-slate-100">
              <Button variant="outline" className="flex-1" onClick={() => setShowPayModal(false)} disabled={paying}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#1E4D38] hover:bg-[#153627] text-white"
                onClick={() => executeSettlePayment(currentRes.id)}
                disabled={paying}
              >
                {paying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Confirming Remittance...
                  </>
                ) : (
                  `Authorize Settlement (${formatNaira(currentRes.totalAmount)})`
                )}
              </Button>
            </div>
          </div>
        </Modal>

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
