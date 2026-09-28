'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Loader2, Clock, CheckCircle2, AlertTriangle, CreditCard, Plus, ArrowRight, ShieldCheck, DollarSign, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/lib/auth';
import { useVendorReservations, updateReservationStatus, deleteBoothReservation } from '@/lib/supabase-queries';
import { formatNaira } from '@/lib/design-tokens';
import { PAYSTACK_PUBLIC_KEY } from '@/lib/paystack';
import { FadeIn } from '@/components/ui/FadeIn';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ReservationStatus } from '@/lib/types';

function PermitContent() {
  const router = useRouter();
  const { user, loading: authLoading, signOutUser } = useAuth();
  const { reservations, loading: resLoading } = useVendorReservations(user?.uid || undefined);

  const [activeReservationIndex, setActiveReservationIndex] = useState<number | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Deletion modal state
  const [deletingResId, setDeletingResId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (reservations.length > 0 && activeReservationIndex === null) {
      setActiveReservationIndex(reservations.length - 1);
    } else if (reservations.length > 0 && activeReservationIndex !== null && activeReservationIndex >= reservations.length) {
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

  const currentRes = activeReservationIndex !== null && reservations[activeReservationIndex]
    ? reservations[activeReservationIndex]
    : reservations[reservations.length - 1];

  const handlePayWithPaystack = async () => {
    if (!currentRes || !user) return;
    setPaying(true);
    setPaymentError(null);

    try {
      // Ensure Paystack Inline script is loaded
      if (typeof window !== 'undefined' && !(window as any).PaystackPop) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://js.paystack.co/v1/inline.js';
          script.onload = resolve;
          script.onerror = () => reject(new Error('Failed to load Paystack payment gateway'));
          document.body.appendChild(script);
        });
      }

      const resId = currentRes.id;

      const handleSuccess = function (response: any) {
        const reference = response.reference || response.trxref || 'PST-SUCCESS';
        updateReservationStatus(resId, 'CONFIRMED_PAID', reference)
          .then(() => {
            setShowPayModal(false);
          })
          .catch((err: any) => {
            setPaymentError(err.message || 'Payment completed, but database status update failed.');
          })
          .finally(() => {
            setPaying(false);
          });
      };

      const handleClose = function () {
        setPaying(false);
      };

      const paystackOptions = {
        key: PAYSTACK_PUBLIC_KEY,
        email: currentRes.profile?.email || user.email || '',
        amount: Math.round(currentRes.totalAmount * 100),
        currency: 'NGN',
        channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
        ref: 'PST-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        metadata: {
          custom_fields: [
            {
              display_name: 'Organization Name',
              variable_name: 'org_name',
              value: currentRes.profile?.orgName || 'Exhibitor',
            },
            {
              display_name: 'Reservation Reference',
              variable_name: 'reservation_ref',
              value: currentRes.referenceId,
            },
          ],
        },
        callback: handleSuccess,
        onSuccess: handleSuccess,
        onClose: handleClose,
        onCancel: handleClose,
      };

      const handler = (window as any).PaystackPop.setup(paystackOptions);
      handler.openIframe();
    } catch (err: any) {
      console.error('Paystack initialization error:', err);
      setPaymentError(err.message || 'Failed to initialize Paystack gateway');
      setPaying(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingResId) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      await deleteBoothReservation(deletingResId);
      setDeletingResId(null);
      setActiveReservationIndex(0);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete reservation');
    } finally {
      setDeleting(false);
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

  const isPendingApproval = currentRes.status === 'RESERVED_PENDING_APPROVAL' || currentRes.status === 'CART';
  const isApprovedPendingPayment = currentRes.status === 'APPROVED_PENDING_PAYMENT';
  const isConfirmedPaid = currentRes.status === 'CONFIRMED_PAID';
  const isRevoked = currentRes.status === 'REVOKED';

  const deletingTarget = reservations.find((r) => r.id === deletingResId);

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
              {reservations.map((res, idx) => {
                const canDelete = res.status === 'RESERVED_PENDING_APPROVAL' || res.status === 'CART';
                return (
                  <div key={res.id} className="inline-flex items-center">
                    <button
                      onClick={() => setActiveReservationIndex(idx)}
                      className={`px-3.5 py-1.5 font-mono text-xs transition-all border ${
                        canDelete ? 'rounded-l-lg' : 'rounded-lg'
                      } ${
                        idx === (activeReservationIndex ?? reservations.length - 1)
                          ? 'bg-slate-900 text-white font-bold border-slate-900 shadow-sm'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200/60'
                      }`}
                    >
                      {res.referenceId} ({res.assignedBoothNumber === 'Pending Assignment' ? 'Pending' : res.assignedBoothNumber})
                    </button>
                    {canDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingResId(res.id);
                        }}
                        title="Cancel this reservation"
                        className="px-2 py-1.5 bg-rose-50 border border-l-0 border-rose-200 text-rose-600 hover:bg-rose-100 rounded-r-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
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
                  <h4 className="font-bold text-sm">Application Pending Secretariat Approval</h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Your booth space request is currently under review by the Secretariat Committee. Once accepted, you will be able to proceed to Pay for Booth.
                  </p>
                </div>
              </div>
            </Alert>
          </FadeIn>
        )}

        {isApprovedPendingPayment && (
          <FadeIn delay={0}>
            <div className="mb-6 bg-[#E8F3ED] border-2 border-[#1E4D38] rounded-xl p-6 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded text-xs font-bold bg-[#1E4D38] text-white mb-2 uppercase tracking-wider">
                    Application Approved
                  </span>
                  <h4 className="font-bold text-slate-900 text-lg">Your Booth Application Has Been Accepted!</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Base Space Rate: <span className="font-semibold">{formatNaira(currentRes.basePrice)}</span>
                    {currentRes.additionalFees > 0 && (
                      <> + Custom Surcharge: <span className="font-semibold">{formatNaira(currentRes.additionalFees)}</span></>
                    )}
                  </p>
                  <p className="text-base font-bold text-slate-900 mt-1">
                    Total Amount Due: {formatNaira(currentRes.totalAmount)}
                  </p>
                </div>
                <Button
                  onClick={() => setShowPayModal(true)}
                  className="bg-[#1E4D38] hover:bg-[#153627] text-white font-bold text-sm px-6 py-3.5 shadow-md flex-shrink-0"
                >
                  Pay for Booth ({formatNaira(currentRes.totalAmount)}) &rarr;
                </Button>
              </div>
            </div>
          </FadeIn>
        )}

        {isConfirmedPaid && (
          <FadeIn delay={0}>
            <div className="mb-6 bg-emerald-50 border-2 border-emerald-500 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 text-white rounded-full flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white mb-0.5 uppercase tracking-wider">
                    Payment Received
                  </span>
                  <h4 className="font-bold text-slate-900 text-base">Payment Received & Confirmed</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Your payment of <strong className="text-slate-900">{formatNaira(currentRes.totalAmount)}</strong> has been received and verified. Your digital exhibition permit and accreditation pass are active.
                  </p>
                </div>
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

              {/* Vendor Info Section */}
              <div className="bg-slate-50 rounded-lg p-6 mb-6 text-left border border-slate-100">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-heading font-bold text-slate-900">
                    {currentRes.profile?.orgName || 'Exhibitor Organization'}
                  </h2>
                  {isPendingApproval && (
                    <button
                      onClick={() => setDeletingResId(currentRes.id)}
                      className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-semibold bg-rose-50 px-2.5 py-1 rounded border border-rose-200 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Cancel / Remove Space
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-600">
                  <div>
                    <span className="block text-slate-400 text-xs mb-0.5">Representative</span>
                    <span className="font-medium text-slate-800 break-words">{currentRes.profile?.contactPerson || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 text-xs mb-0.5">What I Sell</span>
                    <span className="font-medium text-slate-800 break-words">{currentRes.profile?.sector || 'General Merchant'}</span>
                  </div>
                  <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200/60">
                    <div>
                      <span className="block text-slate-400 text-xs mb-0.5">Email</span>
                      <span className="font-medium text-slate-800 break-all">{currentRes.profile?.email || user.email}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 text-xs mb-0.5">Phone</span>
                      <span className="font-medium text-slate-800 break-all">{currentRes.profile?.phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-center items-center gap-2">
                <Badge variant={currentRes.tierName.toLowerCase().includes('sage') ? 'sage' : currentRes.tierName.toLowerCase().includes('champagne') ? 'champagne' : 'slate'}>
                  {currentRes.tierName}
                </Badge>
                {isConfirmedPaid && <Badge variant="active" className="bg-emerald-100 text-emerald-900 font-bold border border-emerald-300">Payment Received & Confirmed</Badge>}
                {isApprovedPendingPayment && <Badge variant="champagne" className="bg-amber-100 text-amber-900 font-bold border border-amber-300">Application Approved — Proceed to Pay</Badge>}
                {isPendingApproval && <Badge variant="slate">Pending Secretariat Review</Badge>}
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
              {isConfirmedPaid ? (
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
              ) : (
                <div className="text-center bg-slate-50 p-6 rounded-xl border border-slate-200 w-full max-w-sm">
                  <Clock className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                  <h4 className="font-semibold text-slate-800 text-sm mb-1">QR Accreditation Pass Pending</h4>
                  <p className="text-xs text-slate-500">Your scannable gate pass will activate automatically as soon as payment is settled.</p>
                </div>
              )}

              <p className="text-xs text-slate-500 mt-4 text-center max-w-xs">
                Scan barcode at Abuja Festival Gate 3 Accreditation Checkpoint
              </p>
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 flex flex-col sm:flex-row justify-between items-center text-sm text-slate-500 gap-4">
              <div>
                <span className="block text-slate-700 font-medium">
                  {isConfirmedPaid ? 'Payment Status: Payment Received' : `Total Due: ${formatNaira(currentRes.totalAmount)}`}
                </span>
                <span className="block text-xs text-slate-400">Created: {new Date(currentRes.createdAt).toLocaleDateString()}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </FadeIn>

        {/* Paystack Payment Settlement Modal */}
        <Modal
          isOpen={showPayModal}
          onClose={() => !paying && setShowPayModal(false)}
          title="Pay for Exhibition Booth"
          size="md"
        >
          <div className="space-y-6">
            <div className="bg-[#E8F3ED] border border-[#B8D8C5] rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Amount Due</p>
                <p className="text-2xl font-black text-[#133325] font-heading">{formatNaira(currentRes.totalAmount)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Exhibition Space</p>
                <p className="text-sm font-semibold text-[#1E4D38]">{currentRes.tierName}</p>
              </div>
            </div>

            {paymentError && (
              <Alert variant="error">{paymentError}</Alert>
            )}

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">
                Paystack Live Secure Gateway
              </label>

              <div className="p-4 border-2 border-[#1E4D38] bg-[#1E4D38]/5 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-[#1E4D38] text-white">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Paystack Checkout Gateway</p>
                    <p className="text-xs text-slate-500">Naira Debit Cards, Bank Transfer, USSD, Apple Pay</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-3 border-t border-slate-100">
              <Button variant="outline" className="flex-1" onClick={() => setShowPayModal(false)} disabled={paying}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#1E4D38] hover:bg-[#153627] text-white font-bold"
                onClick={handlePayWithPaystack}
                disabled={paying}
              >
                {paying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting to Paystack...
                  </>
                ) : (
                  `Pay ${formatNaira(currentRes.totalAmount)} via Paystack`
                )}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Delete Reservation Confirmation Modal */}
        <Modal
          isOpen={!!deletingResId}
          onClose={() => !deleting && setDeletingResId(null)}
          title="Cancel & Remove Reservation"
          size="sm"
        >
          <div className="space-y-4">
            {deleteError && <Alert variant="error">{deleteError}</Alert>}

            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to cancel and remove reservation <strong className="font-mono text-slate-900">{deletingTarget?.referenceId}</strong> ({deletingTarget?.tierName})?
            </p>
            <p className="text-xs text-slate-500">
              This space request will be removed from your profile and returned to the exhibition catalog.
            </p>

            <div className="pt-4 flex gap-3 border-t border-slate-100">
              <Button variant="outline" className="flex-1" onClick={() => setDeletingResId(null)} disabled={deleting}>
                Keep Space
              </Button>
              <Button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Removing...
                  </>
                ) : (
                  'Yes, Remove Space'
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
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FBFBFA]">
          <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
        </div>
      }
    >
      <PermitContent />
    </Suspense>
  );
}
