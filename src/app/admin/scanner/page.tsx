'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import {
  QrCode,
  Search,
  UserCheck,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  MapPin,
  Loader2,
  Camera
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FadeIn } from '@/components/ui/FadeIn';
import { useReservations } from '@/lib/supabase-queries';
import { BoothReservation } from '@/lib/types';

export default function ScannerPage() {
  const router = useRouter();
  const { reservations } = useReservations();

  const [searchQuery, setSearchQuery] = useState('');
  const [scannedVendor, setScannedVendor] = useState<BoothReservation | null>(null);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'found' | 'not_found'>('idle');
  const [scanMethod, setScanMethod] = useState<'camera' | 'manual'>('camera');
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const processVerification = (queryText: string) => {
    setStatus('scanning');

    setTimeout(() => {
      const cleanQuery = queryText.toLowerCase().trim();
      const vendor = reservations?.find(r =>
        r.referenceId.toLowerCase() === cleanQuery ||
        r.vendorSequence?.toString() === cleanQuery ||
        (r.profile?.orgName && r.profile.orgName.toLowerCase().includes(cleanQuery)) ||
        (r.assignedBoothNumber && r.assignedBoothNumber.toLowerCase() === cleanQuery)
      );

      if (vendor) {
        setScannedVendor(vendor);
        setStatus('found');
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().catch(err => console.error(err));
        }
      } else {
        setScannedVendor(null);
        setStatus('not_found');
      }
    }, 400);
  };

  useEffect(() => {
    if (scanMethod === 'camera' && status === 'idle' && typeof window !== 'undefined') {
      const startScanner = async () => {
        try {
          if (!html5QrCodeRef.current) {
            html5QrCodeRef.current = new Html5Qrcode("reader");
          }

          const qrConfig = { fps: 10, qrbox: { width: 250, height: 250 } };

          await html5QrCodeRef.current.start(
            { facingMode: "environment" },
            qrConfig,
            (decodedText) => {
              let parsedId = decodedText;
              if (decodedText.startsWith('REF:')) {
                const parts = decodedText.split('|');
                parsedId = parts[0].replace('REF:', '').trim();
              } else if (decodedText.startsWith('ORDER:')) {
                const parts = decodedText.split('|');
                parsedId = parts[0].replace('ORDER:', '').trim();
              }
              processVerification(parsedId);
            },
            () => {}
          );
        } catch (err) {
          console.error("Failed to initialize camera scanner:", err);
        }
      };

      const timer = setTimeout(startScanner, 300);

      return () => {
        clearTimeout(timer);
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().catch(err => console.error("Failed to stop scanner:", err));
        }
      };
    }
  }, [scanMethod, status, reservations]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    processVerification(searchQuery);
  };

  const resetScanner = () => {
    setSearchQuery('');
    setScannedVendor(null);
    setStatus('idle');
    setScanMethod('manual');
    setTimeout(() => setScanMethod('camera'), 50);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <button
          onClick={() => router.push('/admin/booths')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Secretariat Dashboard
        </button>

        <div className="flex bg-slate-200/60 p-1 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setScanMethod('camera')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${scanMethod === 'camera' ? 'bg-white shadow text-slate-900' : 'text-slate-600'}`}
          >
            <Camera className="w-3.5 h-3.5" /> Camera Scanner
          </button>
          <button
            onClick={() => setScanMethod('manual')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${scanMethod === 'manual' ? 'bg-white shadow text-slate-900' : 'text-slate-600'}`}
          >
            <Search className="w-3.5 h-3.5" /> Manual Search
          </button>
        </div>
      </div>

      <FadeIn>
        <div className="bg-white rounded-xl border border-slate-200/70 p-8 shadow-sm">
          <div className="text-center max-w-md mx-auto mb-8">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <QrCode className="w-6 h-6 text-slate-700" />
            </div>
            <h1 className="text-2xl font-heading font-bold text-slate-900">
              Accreditation Gate Scanner
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Verify digital exhibition passes and physical stall allocations at Gate 3.
            </p>
          </div>

          {/* Camera View */}
          {scanMethod === 'camera' && status === 'idle' && (
            <div className="max-w-md mx-auto mb-6">
              <div id="reader" className="overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-900 min-h-[280px]"></div>
            </div>
          )}

          {/* Manual Input Form */}
          {scanMethod === 'manual' && status === 'idle' && (
            <form onSubmit={handleManualSubmit} className="max-w-md mx-auto space-y-4 mb-6">
              <Input
                label="Search Reference, Org, or Stall #"
                placeholder="e.g. BTH-9412 or ST-01 or Company Name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                required
              />
              <Button type="submit" className="w-full bg-[#1E4D38] text-white">
                Verify Pass
              </Button>
            </form>
          )}

          {/* Verification Status Feedback */}
          {status === 'scanning' && (
            <div className="text-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-slate-500 mx-auto" />
              <p className="text-sm font-medium text-slate-600">Verifying pass credentials...</p>
            </div>
          )}

          {status === 'found' && scannedVendor && (
            <div className="max-w-lg mx-auto bg-slate-50 rounded-xl p-6 border border-slate-200 text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-7 h-7" />
              </div>

              <div>
                <span className="text-xs font-mono font-bold text-slate-400 block mb-1">
                  REF: {scannedVendor.referenceId}
                </span>
                <h3 className="text-xl font-heading font-bold text-slate-900">
                  {scannedVendor.profile?.orgName || 'Vendor Organization'}
                </h3>
                <p className="text-xs text-slate-500">{scannedVendor.profile?.contactPerson} ({scannedVendor.profile?.phone})</p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Tier:</span>
                  <span className="font-bold text-slate-900">{scannedVendor.tierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Physical Allocation:</span>
                  <span className="font-mono font-bold text-emerald-700">{scannedVendor.assignedBoothNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-bold text-slate-800">{scannedVendor.status}</span>
                </div>
              </div>

              <Button onClick={resetScanner} className="w-full bg-slate-900 text-white">
                Scan Next Pass
              </Button>
            </div>
          )}

          {status === 'not_found' && (
            <div className="max-w-md mx-auto text-center py-8 space-y-4">
              <AlertCircle className="w-12 h-12 text-rose-600 mx-auto" />
              <h3 className="text-lg font-bold text-slate-900">No Matching Record Found</h3>
              <p className="text-xs text-slate-500">
                The scanned pass reference could not be verified in the Secretariat database.
              </p>
              <Button onClick={resetScanner} variant="outline" className="w-full">
                Try Again
              </Button>
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
