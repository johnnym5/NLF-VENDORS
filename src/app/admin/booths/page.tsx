'use client';

import React, { useState, useEffect } from 'react';
import { BoothTier, BoothReservation, ReservationStatus, SECTORS } from '@/lib/types';
import { getTierColors, formatNaira } from '@/lib/design-tokens';
import {
  useTiers,
  useReservations,
  updateReservationStatus,
  addCustomSurcharge,
  assignBoothNumber,
  deleteBoothReservation,
  updateTierPrice,
  updateTierStock,
  toggleTierLock,
  addBoothTier,
  editBoothTierFull,
  deleteBoothTier,
} from '@/lib/supabase-queries';
import { adminCreateVendorAccount } from '@/lib/admin-actions';
import { ManualTransferManagement } from '@/components/admin/ManualTransferManagement';
import { ExhibitionCategoryManagement } from '@/components/admin/ExhibitionCategoryManagement';
import { useExhibitionCategory } from '@/lib/exhibition-category';
import { useApplicationFields } from '@/lib/exhibition-category-data';
import { FadeIn } from '@/components/ui/FadeIn';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import {
  Settings,
  Users,
  Lock,
  Unlock,
  Save,
  ShieldOff,
  ShieldCheck,
  Search,
  Plus,
  QrCode,
  Edit,
  Trash2,
  CheckCircle,
  UserPlus,
  DollarSign,
  FileText,
  MapPin,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { activeCategory, categories, setActiveCategory, loading: categoriesLoading } = useExhibitionCategory();
  const { tiers, loading: tiersLoading } = useTiers(activeCategory?.id);
  const { reservations, loading: resLoading } = useReservations(activeCategory?.id);
  const { fields: categoryFields } = useApplicationFields(activeCategory?.id, true);

  const [localPrices, setLocalPrices] = useState<Record<string, number>>({});
  const [localStocks, setLocalStocks] = useState<Record<string, number>>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [editingBoothId, setEditingBoothId] = useState<string | null>(null);
  const [editingBoothValue, setEditingBoothValue] = useState('');

  // Custom Request Modal State
  const [inspectingReservation, setInspectingReservation] = useState<BoothReservation | null>(null);
  const [surchargeAmount, setSurchargeAmount] = useState<number>(0);
  const [surchargeNotes, setSurchargeNotes] = useState<string>('');
  const [surchargeSubmitting, setSurchargeSubmitting] = useState(false);

  // Manual Onboarding Modal State
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [onboardData, setOnboardData] = useState({
    email: '',
    orgName: '',
    contactPerson: '',
    phone: '',
    sector: SECTORS[0] as string,
    website: '',
    businessDescription: '',
    tierId: '',
  });
  const [onboardSubmitting, setOnboardSubmitting] = useState(false);
  const [onboardApplicationAnswers, setOnboardApplicationAnswers] = useState<Record<string, string | number | boolean | null>>({});
  const [onboardResult, setOnboardResult] = useState<any>(null);
  const [onboardError, setOnboardError] = useState<string | null>(null);

  // Add/Edit Tier Modal State
  const [showTierModal, setShowTierModal] = useState(false);
  const [editingTier, setEditingTier] = useState<BoothTier | null>(null);
  const [tierFormData, setTierFormData] = useState({
    name: '',
    dimension: '',
    colorCode: 'sage' as any,
    price: 150000,
    stock: 20,
    initialStock: 20,
    perksText: '',
  });

  // Sync local tier state
  useEffect(() => {
    if (tiers) {
      setLocalPrices(prev => {
        const next = { ...prev };
        tiers.forEach(tier => {
          if (next[tier.id] === undefined) next[tier.id] = tier.price;
        });
        return next;
      });
      setLocalStocks(prev => {
        const next = { ...prev };
        tiers.forEach(tier => {
          if (next[tier.id] === undefined) next[tier.id] = tier.stock;
        });
        return next;
      });
      if (tiers.length > 0 && !tiers.some((tier) => tier.id === onboardData.tierId)) {
        setOnboardData(prev => ({ ...prev, tierId: tiers[0].id }));
      }
    }
  }, [tiers, onboardData.tierId]);

  useEffect(() => { setOnboardApplicationAnswers({}); }, [activeCategory?.id]);

  const handlePriceUpdate = async (tierId: string) => {
    const newPrice = localPrices[tierId];
    if (newPrice !== undefined) {
      await updateTierPrice(tierId, newPrice);
    }
  };

  const handleStockUpdate = async (tierId: string) => {
    const newStock = localStocks[tierId];
    if (newStock !== undefined) {
      await updateTierStock(tierId, newStock);
    }
  };

  const handleSaveBoothNumber = async (reservationId: string) => {
    await assignBoothNumber(reservationId, editingBoothValue);
    setEditingBoothId(null);
  };

  const handleStatusChange = async (reservationId: string, newStatus: ReservationStatus) => {
    try {
      if (newStatus === 'CONFIRMED_PAID') {
        alert('Use the manual transfer review or verify the Paystack payment before marking this reservation paid.');
        return;
      }
      await updateReservationStatus(reservationId, newStatus);
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleAttachSurcharge = async (requestId?: string) => {
    if (!inspectingReservation) return;
    setSurchargeSubmitting(true);
    try {
      await addCustomSurcharge(
        inspectingReservation.id,
        surchargeAmount,
        requestId,
        surchargeNotes
      );
      setInspectingReservation(null);
      setSurchargeAmount(0);
      setSurchargeNotes('');
    } catch (err: any) {
      alert(err.message || 'Failed to attach surcharge');
    } finally {
      setSurchargeSubmitting(false);
    }
  };

  const handleManualOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardSubmitting(true);
    setOnboardError(null);
    setOnboardResult(null);

    const missingQuestion = categoryFields.find((field) => field.required && (onboardApplicationAnswers[field.fieldKey] === undefined || onboardApplicationAnswers[field.fieldKey] === null || onboardApplicationAnswers[field.fieldKey] === '' || (field.fieldType === 'checkbox' && onboardApplicationAnswers[field.fieldKey] !== true)));
    if (missingQuestion) {
      setOnboardError(`Please answer “${missingQuestion.label}”.`);
      setOnboardSubmitting(false);
      return;
    }
    const result = await adminCreateVendorAccount({ ...onboardData, sector: activeCategory?.slug === 'food-commercial-vendors' ? onboardData.sector : '', applicationData: onboardApplicationAnswers });
    if (result.success) {
      setOnboardResult(result);
    } else {
      setOnboardError(result.error || 'Failed to onboard vendor');
    }
    setOnboardSubmitting(false);
  };

  const handleSaveTierForm = async () => {
    const perks = tierFormData.perksText
      .split('\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (editingTier) {
      await editBoothTierFull(editingTier.id, {
        name: tierFormData.name,
        dimension: tierFormData.dimension,
        colorCode: tierFormData.colorCode,
        price: tierFormData.price,
        stock: tierFormData.stock,
        initialStock: tierFormData.initialStock,
        perks,
      });
    } else {
      await addBoothTier({
        categoryId: activeCategory!.id,
        name: tierFormData.name,
        dimension: tierFormData.dimension,
        colorCode: tierFormData.colorCode,
        price: tierFormData.price,
        stock: tierFormData.stock,
        initialStock: tierFormData.initialStock,
        perks,
      });
    }
    setShowTierModal(false);
    setEditingTier(null);
  };

  // Filter reservations
  const filteredReservations = reservations.filter((r) => {
    const matchSearch =
      r.referenceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.profile?.orgName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.assignedBoothNumber?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchTier = tierFilter === 'all' || r.tierId === tierFilter;
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;

    return matchSearch && matchTier && matchStatus;
  });

  const totalConfirmedRevenue = reservations
    .filter((r) => r.status === 'CONFIRMED_PAID')
    .reduce((sum, r) => sum + r.totalAmount, 0);

  if (categoriesLoading || tiersLoading || resLoading) return <div className="flex min-h-[60vh] items-center justify-center text-slate-500">Loading category dashboard…</div>;

  return (
    <div className="min-h-screen bg-transparent py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Dashboard Title Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-1">
              National Livestock Festival 2026 — Secretariat
            </span>
            <h1 className="text-2xl font-heading font-bold text-slate-900">
              {activeCategory?.name || 'Exhibitor'} Secretariat Dashboard
            </h1>
            <p className="mt-1 text-xs text-slate-500">Managing {activeCategory?.name || 'exhibition'} · {categories.length} categories configured</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {categories.map((category) => <Button key={category.id} size="sm" variant={category.id === activeCategory?.id ? 'primary' : 'outline'} onClick={() => setActiveCategory(category.id)}>{category.name}{category.active ? '' : ' (Archived)'}</Button>)}
            <Link href="/admin/scanner">
              <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                <QrCode className="w-4 h-4" /> Scanner Portal
              </Button>
            </Link>
            <Button
              size="sm"
              disabled={!activeCategory?.active}
              className="bg-[#1E4D38] hover:bg-[#153627] text-white flex items-center gap-1.5"
              onClick={() => {
                setOnboardResult(null);
                setOnboardError(null);
                setShowOnboardModal(true);
              }}
            >
              <UserPlus className="w-4 h-4" /> Manual Onboard Exhibitor
            </Button>
          </div>
        </div>

        {/* Overview Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200/70 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Confirmed Revenue</span>
            <span className="text-2xl font-bold text-slate-900">{formatNaira(totalConfirmedRevenue)}</span>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200/70 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Total Applications</span>
            <span className="text-2xl font-bold text-slate-900">{reservations.length}</span>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200/70 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Pending Approval</span>
            <span className="text-2xl font-bold text-amber-600">
              {reservations.filter((r) => r.status === 'RESERVED_PENDING_APPROVAL').length}
            </span>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200/70 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Allocated & Paid</span>
            <span className="text-2xl font-bold text-emerald-600">
              {reservations.filter((r) => r.status === 'CONFIRMED_PAID').length}
            </span>
          </div>
        </div>

        <ExhibitionCategoryManagement />

        {activeCategory && !activeCategory.active && <Alert variant="warning">This category is archived. Existing applications and permits remain available for review, but new applications are disabled.</Alert>}

        {/* TIER MANAGEMENT SECTION */}
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-heading font-bold text-slate-900">{activeCategory?.name || 'Exhibition'} Tiers & Quota Controls</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={!activeCategory?.active}
              onClick={() => {
                setEditingTier(null);
                setTierFormData({
                  name: '',
                  dimension: '',
                  colorCode: 'sage',
                  price: 150000,
                  stock: 20,
                  initialStock: 20,
                  perksText: '',
                });
                setShowTierModal(true);
              }}
              className="flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add New Tier
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tiers.map((tier) => {
              const color = getTierColors(tier.colorCode);
              return (
                <div
                  key={tier.id}
                  className={`rounded-xl border p-5 space-y-4 ${color.cardBg} ${color.borderColor}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className={`font-heading font-bold text-base ${color.headingText}`}>
                        {tier.name}
                      </h3>
                      <p className="text-xs text-slate-500">{tier.dimension}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleTierLock(tier.id, tier.isLocked)}
                      className="p-1.5 h-auto text-slate-600 hover:text-slate-900"
                    >
                      {tier.isLocked ? <Lock className="w-4 h-4 text-red-600" /> : <Unlock className="w-4 h-4 text-green-600" />}
                    </Button>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">Unit Price (₦)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={localPrices[tier.id] ?? tier.price}
                          onChange={(e) => setLocalPrices((prev) => ({ ...prev, [tier.id]: Number(e.target.value) }))}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white font-mono"
                        />
                        <Button size="sm" onClick={() => handlePriceUpdate(tier.id)} className="px-2.5">
                          <Save className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">Remaining Quota Stock</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={localStocks[tier.id] ?? tier.stock}
                          onChange={(e) => setLocalStocks((prev) => ({ ...prev, [tier.id]: Number(e.target.value) }))}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white font-mono"
                        />
                        <Button size="sm" onClick={() => handleStockUpdate(tier.id)} className="px-2.5">
                          <Save className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-slate-200/60 text-xs">
                    <span className="text-slate-500">Status: <strong>{tier.isLocked ? 'Locked' : 'Open'}</strong></span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingTier(tier);
                          setTierFormData({
                            name: tier.name,
                            dimension: tier.dimension,
                            colorCode: tier.colorCode,
                            price: tier.price,
                            stock: tier.stock,
                            initialStock: tier.initialStock,
                            perksText: tier.perks.join('\n'),
                          });
                          setShowTierModal(true);
                        }}
                        className="text-slate-600 hover:text-slate-900 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete tier?')) deleteBoothTier(tier.id);
                        }}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <ManualTransferManagement categoryId={activeCategory?.id} />

        {/* RESERVATIONS MANAGEMENT DIRECTORY */}
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-heading font-bold text-slate-900">
                {activeCategory?.name || 'Exhibitor'} Applications & Allocation Directory ({filteredReservations.length})
              </h2>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search ref, org, email, booth..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="RESERVED_PENDING_APPROVAL">Pending Approval</option>
                <option value="APPROVED_PENDING_PAYMENT">Approved (Pending Payment)</option>
                <option value="CONFIRMED_PAID" disabled>Confirmed & Paid (verified payment only)</option>
                <option value="REVOKED">Revoked</option>
              </select>
            </div>
          </div>

          {/* Directory Table */}
          <div className="overflow-x-auto border border-slate-200/80 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-3">Reference / Org</th>
                  <th className="p-3">Tier Space</th>
                  <th className="p-3">Rate + Surcharges</th>
                  <th className="p-3">Physical Booth #</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredReservations.map((res) => (
                  <tr key={res.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3">
                      <span className="font-mono font-bold text-slate-900 block">{res.referenceId}</span>
                      <span className="font-semibold text-slate-800 block">{res.profile?.orgName || 'N/A'}</span>
                      <span className="text-slate-400 block">{res.profile?.email} ({res.profile?.phone})</span>
                    </td>
                    <td className="p-3">
                      <span className="font-medium text-slate-800 block">{res.tierName}</span>
                      {res.profile?.sector && <span className="text-slate-500 text-[11px] block">{res.profile.sector}</span>}
                      {categoryFields.filter((field) => res.applicationData?.[field.fieldKey] !== undefined && res.applicationData?.[field.fieldKey] !== null).map((field) => <span key={field.id} className="block max-w-64 truncate text-slate-500 text-[11px]" title={`${field.label}: ${String(res.applicationData?.[field.fieldKey])}`}>{field.label}: {String(res.applicationData?.[field.fieldKey])}</span>)}
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-slate-900 block">{formatNaira(res.totalAmount)}</span>
                      {res.additionalFees > 0 && (
                        <span className="text-amber-700 text-[10px] font-semibold block">
                          Includes {formatNaira(res.additionalFees)} Fee
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {editingBoothId === res.id ? (
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={editingBoothValue}
                            onChange={(e) => setEditingBoothValue(e.target.value)}
                            className="px-2 py-1 border border-slate-300 rounded text-xs w-24 font-mono"
                          />
                          <Button size="sm" onClick={() => handleSaveBoothNumber(res.id)} className="px-2 py-1 h-auto text-[11px]">
                            Save
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-800">{res.assignedBoothNumber}</span>
                          <button
                            onClick={() => {
                              setEditingBoothId(res.id);
                              setEditingBoothValue(res.assignedBoothNumber);
                            }}
                            className="text-slate-400 hover:text-slate-700 p-0.5"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <select
                        value={res.status}
                        onChange={(e) => handleStatusChange(res.id, e.target.value as ReservationStatus)}
                        className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                          res.status === 'CONFIRMED_PAID'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : res.status === 'APPROVED_PENDING_PAYMENT'
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : res.status === 'RESERVED_PENDING_APPROVAL'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}
                      >
                        <option value="RESERVED_PENDING_APPROVAL">Pending Approval</option>
                        <option value="APPROVED_PENDING_PAYMENT">Approved (Awaiting Payment)</option>
                        <option value="CONFIRMED_PAID" disabled>Confirmed & Paid (verified payment only)</option>
                        <option value="REVOKED">Revoked</option>
                      </select>
                    </td>
                    <td className="p-3 text-right flex justify-end gap-1.5 items-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setInspectingReservation(res);
                          setSurchargeAmount(0);
                          setSurchargeNotes('');
                        }}
                        className="text-xs px-2.5 py-1 h-auto"
                      >
                        Inspect / Fee {res.customRequests && res.customRequests.length > 0 && `(${res.customRequests.length})`}
                      </Button>
                      <button
                        onClick={async () => {
                          if (confirm(`Delete reservation ${res.referenceId}?`)) {
                            await deleteBoothReservation(res.id);
                          }
                        }}
                        title="Delete Reservation"
                        className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded border border-rose-200 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* INSPECT & CUSTOM SURCHARGE MODAL */}
      <Modal
        isOpen={!!inspectingReservation}
        onClose={() => setInspectingReservation(null)}
        title={`Inspect Reservation — ${inspectingReservation?.referenceId}`}
        size="lg"
      >
        {inspectingReservation && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div>
                <span className="block text-slate-400 mb-0.5">Organization</span>
                <span className="font-bold text-slate-900">{inspectingReservation.profile?.orgName}</span>
              </div>
              <div>
                <span className="block text-slate-400 mb-0.5">Contact Person</span>
                <span className="font-medium text-slate-800">{inspectingReservation.profile?.contactPerson} ({inspectingReservation.profile?.phone})</span>
              </div>
              <div>
                <span className="block text-slate-400 mb-0.5">Space Rate</span>
                <span className="font-bold text-slate-900">{formatNaira(inspectingReservation.basePrice)}</span>
              </div>
              <div>
                <span className="block text-slate-400 mb-0.5">Current Additional Surcharges</span>
                <span className="font-bold text-slate-900">{formatNaira(inspectingReservation.additionalFees)}</span>
              </div>
            </div>

            {/* Custom Requests List */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Vendor Custom Requests</h4>
              {inspectingReservation.customRequests && inspectingReservation.customRequests.length > 0 ? (
                <div className="space-y-3">
                  {inspectingReservation.customRequests.map((req) => (
                    <div key={req.id} className="border border-slate-200 rounded-lg p-3 bg-white text-xs space-y-2">
                      <p className="font-medium text-slate-800">&ldquo;{req.requestText}&rdquo;</p>
                      <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                        <Input
                          type="number"
                          placeholder="Attach Surcharge (₦)"
                          value={surchargeAmount}
                          onChange={(e) => setSurchargeAmount(Number(e.target.value))}
                          className="text-xs py-1"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleAttachSurcharge(req.id)}
                          disabled={surchargeSubmitting}
                          className="bg-[#1E4D38] text-white"
                        >
                          Attach Fee & Approve Request
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No custom requests submitted for this reservation.</p>
              )}
            </div>

            {/* Direct Surcharge Modifier */}
            <div className="border-t border-slate-200 pt-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Attach General Secretariat Surcharge</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Surcharge Amount (₦)"
                  type="number"
                  value={surchargeAmount}
                  onChange={(e) => setSurchargeAmount(Number(e.target.value))}
                />
                <Input
                  label="Admin Notes / Itemization"
                  placeholder="e.g. 30A power hookup + cold storage extension"
                  value={surchargeNotes}
                  onChange={(e) => setSurchargeNotes(e.target.value)}
                />
              </div>
              <Button
                onClick={() => handleAttachSurcharge()}
                disabled={surchargeSubmitting || surchargeAmount <= 0}
                className="w-full bg-slate-900 text-white text-xs"
              >
                Attach Surcharge to Total Due ({formatNaira(surchargeAmount)})
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MANUAL VENDOR ONBOARDING MODAL */}
      <Modal
        isOpen={showOnboardModal}
        onClose={() => setShowOnboardModal(false)}
        title="Secretariat Manual Vendor Onboarding"
        size="md"
      >
        {onboardResult ? (
          <div className="text-center py-6 space-y-4">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900">Exhibitor Account Created & Space Allocated!</h3>
            <div className="bg-slate-50 p-4 rounded-lg text-left text-xs space-y-2 border border-slate-200">
              <p><strong>Email:</strong> {onboardData.email}</p>
              {onboardResult.tempPassword && (
                <p><strong>Temporary Password:</strong> <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-900 font-bold">{onboardResult.tempPassword}</code></p>
              )}
              <p><strong>Reservation Ref:</strong> {onboardResult.referenceId}</p>
            </div>
            <Button onClick={() => setShowOnboardModal(false)} className="w-full">
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleManualOnboard} className="space-y-4 text-xs">
            {onboardError && <Alert variant="error">{onboardError}</Alert>}

            <Input
              label="Exhibitor Email *"
              type="email"
              value={onboardData.email}
              onChange={(e) => setOnboardData((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
            <Input
              label="Organization Name *"
              value={onboardData.orgName}
              onChange={(e) => setOnboardData((prev) => ({ ...prev, orgName: e.target.value }))}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Contact Person *"
                value={onboardData.contactPerson}
                onChange={(e) => setOnboardData((prev) => ({ ...prev, contactPerson: e.target.value }))}
                required
              />
              <Input
                label="Phone Number *"
                value={onboardData.phone}
                onChange={(e) => setOnboardData((prev) => ({ ...prev, phone: e.target.value }))}
                required
              />
            </div>

            {activeCategory?.slug === 'food-commercial-vendors' && <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Industry Sector *</label>
              <select
                value={onboardData.sector}
                onChange={(e) => setOnboardData((prev) => ({ ...prev, sector: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white"
              >
                {SECTORS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>}

            {categoryFields.filter((field) => field.active).map((field) => {
              const value = onboardApplicationAnswers[field.fieldKey];
              const setAnswer = (answer: string | number | boolean | null) => setOnboardApplicationAnswers((current) => ({ ...current, [field.fieldKey]: answer }));
              if (field.fieldType === 'checkbox') return <label key={field.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={value === true} onChange={(event) => setAnswer(event.target.checked)} />{field.label}{field.required && ' *'}</label>;
              if (field.fieldType === 'textarea') return <label key={field.id} className="block text-[11px] font-bold text-slate-700">{field.label}{field.required && ' *'}<textarea required={field.required} value={typeof value === 'string' ? value : ''} onChange={(event) => setAnswer(event.target.value)} rows={3} className="mt-1 w-full rounded border border-slate-300 p-2 text-xs" /></label>;
              if (field.fieldType === 'select') return <label key={field.id} className="block text-[11px] font-bold text-slate-700">{field.label}{field.required && ' *'}<select required={field.required} value={typeof value === 'string' ? value : ''} onChange={(event) => setAnswer(event.target.value)} className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-xs"><option value="">Choose an option</option>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
              return <label key={field.id} className="block text-[11px] font-bold text-slate-700">{field.label}{field.required && ' *'}<input required={field.required} type={field.fieldType === 'number' ? 'number' : field.fieldType === 'date' ? 'date' : 'text'} value={value === null || value === undefined ? '' : String(value)} onChange={(event) => setAnswer(field.fieldType === 'number' ? (event.target.value ? Number(event.target.value) : null) : event.target.value)} className="mt-1 w-full rounded border border-slate-300 p-2 text-xs" /></label>;
            })}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Exhibition Space Tier *</label>
              <select
                value={onboardData.tierId}
                onChange={(e) => setOnboardData((prev) => ({ ...prev, tierId: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white"
              >
                {tiers.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({formatNaira(t.price)})</option>
                ))}
              </select>
            </div>

            <Button type="submit" disabled={onboardSubmitting} className="w-full bg-[#1E4D38] text-white">
              {onboardSubmitting ? 'Onboarding Exhibitor...' : 'Onboard & Mark Confirmed Paid'}
            </Button>
          </form>
        )}
      </Modal>

      {/* ADD/EDIT TIER MODAL */}
      <Modal
        isOpen={showTierModal}
        onClose={() => setShowTierModal(false)}
        title={editingTier ? 'Edit Exhibition Tier' : 'Add New Exhibition Tier'}
        size="md"
      >
        <div className="space-y-4 text-xs">
          <Input
            label="Tier Name *"
            value={tierFormData.name}
            onChange={(e) => setTierFormData((prev) => ({ ...prev, name: e.target.value }))}
          />
          <Input
            label="Dimension Details *"
            value={tierFormData.dimension}
            onChange={(e) => setTierFormData((prev) => ({ ...prev, dimension: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Price (₦) *"
              type="number"
              value={tierFormData.price}
              onChange={(e) => setTierFormData((prev) => ({ ...prev, price: Number(e.target.value) }))}
            />
            <Input
              label="Quota Stock *"
              type="number"
              value={tierFormData.stock}
              onChange={(e) => setTierFormData((prev) => ({ ...prev, stock: Number(e.target.value) }))}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Perks List (One per line)</label>
            <textarea
              rows={4}
              value={tierFormData.perksText}
              onChange={(e) => setTierFormData((prev) => ({ ...prev, perksText: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded text-xs"
            />
          </div>

          <Button onClick={handleSaveTierForm} className="w-full bg-slate-900 text-white">
            Save Tier
          </Button>
        </div>
      </Modal>

    </div>
  );
}
