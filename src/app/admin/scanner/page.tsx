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
import { useOrders } from '@/lib/firestore';

export default function ScannerPage() {
  const router = useRouter();
  const { orders } = useOrders();

  const [searchQuery, setSearchQuery] = useState('');
  const [scannedVendor, setScannedVendor] = useState<any>(null);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'found' | 'not_found'>('idle');
  const [scanMethod, setScanMethod] = useState<'camera' | 'manual'>('camera');
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (scanMethod === 'camera' && status === 'idle' && typeof window !== 'undefined') {
      const startScanner = async () => {
        try {
          if (!html5QrCodeRef.current) {
            html5QrCodeRef.current = new Html5Qrcode("reader");
          }

          const qrConfig = { fps: 10, qrbox: { width: 250, height: 250 } };

          await html5QrCodeRef.current.start(
            { facingMode: "environment" }, // Prioritize back camera
            qrConfig,
            (decodedText) => {
              let parsedId = decodedText;
              if (decodedText.startsWith('ORDER:')) {
                const parts = decodedText.split('|');
                parsedId = parts[0].replace('ORDER:', '').trim();
              }
              processVerification(parsedId);
            },
            () => {} // Ignore scan errors
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
  }, [scanMethod, status, orders]);

  const processVerification = (queryText: string) => {
    setStatus('scanning');

    setTimeout(() => {
      const cleanQuery = queryText.toLowerCase().trim();
      const vendor = orders?.find(o =>
        o.id.toLowerCase() === cleanQuery ||
        o.vendorSequence?.toString() === cleanQuery ||
        o.orgName.toLowerCase().includes(cleanQuery)
      );

      if (vendor) {
        setScannedVendor(vendor);
        setStatus('found');
        // Stop scanning if camera is active to lock the view
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().catch(err => console.error(err));
        }
      } else {
        setScannedVendor(null);
        setStatus('not_found');
      }
    }, 600);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    processVerification(searchQuery);
  };

  const resetScanner = () => {
    setSearchQuery('');
    setScannedVendor(null);
    setStatus('idle');
    // Force toggle scan method to re-mount the camera view engine cleanly
    setScanMethod('manual');
    setTimeout(() => setScanMethod('camera'), 50);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <h1 className="text-xl font-heading font-bold text-slate-900">Accreditation Scanner</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Scanning Interface */}
        <section>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

            {/* Mode Switcher Tabs */}
            <div className="flex border-b border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setScanMethod('camera')}
                className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-all ${
                  scanMethod === 'camera'
                    ? 'border-green-600 text-green-700 bg-white font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <Camera className="w-4 h-4" /> Live Webcam Scan
                </span>
              </button>
              <button
                onClick={() => setScanMethod('manual')}
                className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-all ${
                  scanMethod === 'manual'
                    ? 'border-green-600 text-green-700 bg-white font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <Search className="w-4 h-4" /> Manual Entry Lookup
                </span>
              </button>
            </div>

            {/* Live Camera View Box Container */}
            {scanMethod === 'camera' && status === 'idle' && (
              <div className="p-6 bg-slate-50 border-b border-slate-100">
                <div id="reader" className="w-full bg-slate-900 overflow-hidden rounded-xl shadow-inner border border-slate-200" style={{ minHeight: '300px' }} />
                <p className="text-xs text-center text-slate-400 mt-3 font-medium">
                  Grant permission to camera when prompted by your web browser.
                </p>
              </div>
            )}

            {/* Static Simulated Placeholder Placeholder */}
            {(scanMethod === 'manual' || status !== 'idle') && (
              <div className="bg-slate-900 p-8 flex flex-col items-center justify-center aspect-square border-b border-slate-100">
                <div className="relative z-10 w-full max-w-[220px] aspect-square border-2 border-white/20 rounded-3xl flex items-center justify-center bg-white/5 backdrop-blur-sm">
                  <QrCode className={`w-20 h-20 ${status === 'scanning' ? 'text-blue-400 animate-pulse' : 'text-white/30'}`} />
                  {status === 'scanning' && (
                    <div className="absolute inset-x-0 h-0.5 bg-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.8)] animate-scan-line top-0" style={{ animation: 'scan-line 2s linear infinite' }} />
                  )}
                </div>
                <p className="mt-4 text-white/50 text-xs text-center font-medium uppercase tracking-wider">
                  {status === 'scanning' ? 'Processing Permit Token...' : 'Webcam Interface Inactive'}
                </p>
              </div>
            )}

            <div className="p-6">
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                  Manual Entry Form (Sequence # or Order Reference ID)
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. 1 or BTH-4321"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={status === 'scanning'}>
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* Results Interface */}
        <section>
          {status === 'idle' && (
            <div className="h-full border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-12 text-center text-slate-400">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <UserCheck className="w-8 h-8 text-slate-400" />
              </div>
              <p className="font-medium text-slate-700">Ready to Scan Attendees</p>
              <p className="text-xs mt-1 max-w-xs">Align a vendor permit barcode inside the lens view or execute an query string lookup manually.</p>
            </div>
          )}

          {status === 'scanning' && (
            <div className="h-full bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
              <p className="text-slate-600 font-medium">Querying Accreditation Directory...</p>
            </div>
          )}

          {status === 'not_found' && (
            <FadeIn className="h-full bg-red-50 rounded-2xl border border-red-100 p-8 text-center flex flex-col items-center justify-center">
              <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
              <h2 className="text-xl font-heading font-bold text-red-900 mb-2">Invalid Exhibition Pass</h2>
              <p className="text-red-700 text-sm mb-6">
                The provided identification mapping reference doesn&apos;t match any verified festival space procurement orders.
              </p>
              <Button onClick={resetScanner} className="bg-red-600 hover:bg-red-700 text-white border-none">
                Re-initialize Scanning
              </Button>
            </FadeIn>
          )}

          {status === 'found' && scannedVendor && (
            <FadeIn className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-[#1E4D38] px-6 py-4 flex justify-between items-center text-white">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-300" />
                  <span className="font-bold tracking-wide text-sm">ACCREDITED EXHIBITOR</span>
                </div>
                <span className="font-mono text-sm bg-white/20 px-2 py-0.5 rounded font-bold">Vendor #{scannedVendor.vendorSequence}</span>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-2xl font-heading font-bold text-slate-900">{scannedVendor.orgName}</h3>
                  <p className="text-sm text-slate-500 mt-1">{scannedVendor.contactPerson} • {scannedVendor.phone}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-400 block mb-1">Procured Tier</span>
                    <span className="font-bold text-slate-800 text-sm">{scannedVendor.tierName}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-400 block mb-1">Industry Classification</span>
                    <span className="font-bold text-slate-800 text-sm">{scannedVendor.sector}</span>
                  </div>
                </div>

                <div className={`p-6 rounded-xl border-2 flex flex-col items-center justify-center text-center ${
                  scannedVendor.assignedBoothNumber === 'Pending Assignment'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-green-50 border-green-200 text-green-800'
                }`}>
                  <MapPin className={`w-8 h-8 mb-1.5 ${
                    scannedVendor.assignedBoothNumber === 'Pending Assignment' ? 'text-amber-500' : 'text-green-600'
                  }`} />
                  <span className="text-xs font-bold uppercase tracking-wider mb-1 text-slate-400">Allocated Festival Stand Location</span>
                  <span className="text-3xl font-mono font-black tracking-tight">
                    {scannedVendor.assignedBoothNumber}
                  </span>
                </div>

                <div className="pt-2 flex gap-3">
                  <Button onClick={resetScanner} variant="outline" className="flex-1">
                    Reset Scanner
                  </Button>
                  <Button
                    className="flex-1 bg-[#1E4D38] hover:bg-[#153627] text-white"
                    onClick={() => router.push(`/admin/booths`)}
                  >
                    Manage Allocation Location
                  </Button>
                </div>
              </div>
            </FadeIn>
          )}
        </section>
      </div>

      <style jsx global>{`
        @keyframes scan-line {
          0% { top: 0; }
          100% { top: 100%; }
        }
        #reader video {
          object-fit: cover !important;
          border-radius: 12px;
        }
      `}</style>
    </div>
  );
}
