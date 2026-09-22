'use client';

import React, { useState, useEffect } from 'react';
import { BoothTier, BoothOrder } from '@/lib/types';
import { getTierColors, formatNaira } from '@/lib/design-tokens';
import { 
  useTiers, 
  useOrders, 
  assignBoothNumber, 
  toggleBoothRevocation, 
  updateTierPrice, 
  updateTierStock, 
  toggleTierLock,
  addBoothTier,
  updateTierName
} from '@/lib/firestore';
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
  QrCode
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { tiers, loading: tiersLoading } = useTiers();
  const { orders, loading: ordersLoading } = useOrders();
  
  const [localPrices, setLocalPrices] = useState<Record<string, number>>({});
  const [localStocks, setLocalStocks] = useState<Record<string, number>>({});
  
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [editingBoothId, setEditingBoothId] = useState<string | null>(null);
  const [editingBoothValue, setEditingBoothValue] = useState('');

  // Sync local state when tiers load
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
    }
  }, [tiers]);

  // Fix names instantly if they match the previous scheme
  useEffect(() => {
    if (tiers && tiers.length > 0) {
      tiers.forEach(async (tier) => {
        if (tier.id === 'tier_standard' && tier.name !== 'Basic Booth') {
          await updateTierName(tier.id, 'Basic Booth');
        } else if (tier.id === 'tier_culinary' && tier.name !== 'Standard Booth') {
          await updateTierName(tier.id, 'Standard Booth');
        } else if (tier.id === 'tier_corporate' && tier.name !== 'Premium Booth') {
          await updateTierName(tier.id, 'Premium Booth');
        }
      });
    }
  }, [tiers]);

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

  const handleSetStockZero = async (tierId: string) => {
    setLocalStocks(prev => ({ ...prev, [tierId]: 0 }));
    await updateTierStock(tierId, 0);
  };

  const handleSaveBoothNumber = async (orderDocId: string) => {
    await assignBoothNumber(orderDocId, editingBoothValue);
    setEditingBoothId(null);
  };

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTier, setNewTier] = useState({
    name: '',
    dimension: '',
    price: '',
    stock: '',
    colorCode: 'sage' as 'sage' | 'champagne' | 'slate',
    perksString: '',
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const handleCreateTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTier.name || !newTier.dimension || !newTier.price || !newTier.stock) {
      setAddError('Please fill in all required fields.');
      return;
    }
    setAddLoading(true);
    setAddError(null);
    try {
      const perks = newTier.perksString
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      await addBoothTier({
        name: newTier.name,
        dimension: newTier.dimension,
        price: Number(newTier.price),
        stock: Number(newTier.stock),
        initialStock: Number(newTier.stock),
        colorCode: newTier.colorCode,
        perks,
      });

      setIsAddModalOpen(false);
      setNewTier({
        name: '',
        dimension: '',
        price: '',
        stock: '',
        colorCode: 'sage',
        perksString: '',
      });
    } catch (err: any) {
      setAddError(err.message || 'Failed to add new tier.');
    } finally {
      setAddLoading(false);
    }
  };

  const filteredOrders = orders?.filter(order => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      order.orgName.toLowerCase().includes(query) ||
      order.contactPerson.toLowerCase().includes(query) ||
      order.id.toLowerCase().includes(query) ||
      (order.assignedBoothNumber && order.assignedBoothNumber.toLowerCase().includes(query)) ||
      (order.vendorSequence && order.vendorSequence.toString().includes(query))
    );

    const matchesTier = tierFilter === 'all' || order.tierId === tierFilter;
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesTier && matchesStatus;
  }) || [];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Tier Configuration Section */}
      <section className="mb-12">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-heading font-semibold text-slate-900 flex items-center gap-2">
              <Settings className="w-6 h-6 text-slate-500" />
              Tier Configuration
            </h2>
            <p className="text-slate-600 mt-1">Manage pricing, inventory, and access controls for each booth tier.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/scanner">
              <Button variant="outline" className="flex items-center gap-2">
                <QrCode className="w-4 h-4" /> Open Scanner
              </Button>
            </Link>
            <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-[#1E4D38] hover:bg-[#163a2a]">
              <Plus className="w-4 h-4" /> Add New Tier
            </Button>
          </div>
        </div>

        {tiersLoading ? (
          <div className="py-12 text-center text-slate-500">Loading tiers...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {tiers?.map((tier, index) => {
              const colors = getTierColors(tier.colorCode);
              return (
                <FadeIn key={tier.id} delay={index * 150} className={`bg-white rounded-xl border p-6 shadow-sm ${colors.borderColor}`}>
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="font-heading font-semibold text-lg text-slate-900">{tier.name}</h3>
                    <Badge variant={tier.colorCode} className={`${colors.badgeBg} ${colors.badgeText}`}>{tier.colorCode}</Badge>
                  </div>

                  <div className="space-y-6">
                    {/* Price Field */}
                    <div className="pb-4 border-b border-slate-100">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Price (NGN)</label>
                      <div className="flex gap-2">
                        <Input 
                          type="number"
                          value={localPrices[tier.id] ?? tier.price}
                          onChange={(e) => setLocalPrices(prev => ({ ...prev, [tier.id]: Number(e.target.value) }))}
                          className={`flex-1 ${colors.borderColor}`}
                        />
                        <Button onClick={() => handlePriceUpdate(tier.id)} variant="outline">
                          Update Price
                        </Button>
                      </div>
                    </div>

                    {/* Stock Field */}
                    <div className="pb-4 border-b border-slate-100">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Available Stock</label>
                      <div className="flex gap-2 mb-2">
                        <Input 
                          type="number"
                          value={localStocks[tier.id] ?? tier.stock}
                          onChange={(e) => setLocalStocks(prev => ({ ...prev, [tier.id]: Number(e.target.value) }))}
                          className={`flex-1 ${colors.borderColor}`}
                        />
                        <Button onClick={() => handleStockUpdate(tier.id)} variant="outline">
                          Update Stock
                        </Button>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">/ {tier.initialStock} initial</span>
                        <button 
                          onClick={() => handleSetStockZero(tier.id)}
                          className="text-red-600 hover:text-red-700 font-medium"
                        >
                          Set to 0
                        </button>
                      </div>
                    </div>

                    {/* Lock Toggle */}
                    <div>
                      {tier.isLocked ? (
                        <div className="flex items-center justify-between bg-red-50 p-4 rounded-lg border border-red-100">
                          <div className="flex items-center gap-2 text-red-700">
                            <Lock className="w-4 h-4" />
                            <span className="font-medium text-sm">Locked</span>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => toggleTierLock(tier.id, true)}>
                            Unlock Tier
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-green-50 p-4 rounded-lg border border-green-100">
                          <div className="flex items-center gap-2 text-green-700">
                            <Unlock className="w-4 h-4" />
                            <span className="font-medium text-sm">Open</span>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => toggleTierLock(tier.id, false)}>
                            Lock Tier
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        )}
      </section>

      {/* Order Directory Section */}
      <section>
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-heading font-semibold text-slate-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-slate-500" />
              Order Directory
            </h2>
            <p className="text-slate-600 mt-1">View all booth orders, assign physical locations, and manage access.</p>
          </div>
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <div className="flex gap-2">
              <Select
                value={tierFilter}
                onChange={(val) => setTierFilter(val)}
                options={[
                  { value: 'all', label: 'All Tiers' },
                  ...(tiers?.map(t => ({ value: t.id, label: t.name })) || [])
                ]}
                className="w-40"
              />
              <Select
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'REVOKED', label: 'Revoked' }
                ]}
                className="w-32"
              />
            </div>
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {ordersLoading ? (
          <div className="py-12 text-center text-slate-500">Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-xl border border-slate-200">
            <p className="text-slate-500">
              {searchQuery ? 'No orders match your search criteria.' : 'No orders have been placed yet.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-[#F6F7F6] text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="px-6 py-4">Vendor #</th>
                  <th className="px-6 py-4">Order Reference</th>
                  <th className="px-6 py-4">Organization</th>
                  <th className="px-6 py-4">Tier & Amount</th>
                  <th className="px-6 py-4">Booth Number</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order, index) => (
                  <FadeIn as="tr" key={order.docId} delay={index * 50} className="hover:bg-slate-50/50 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">#{order.vendorSequence || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-sm text-slate-900">{order.id}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {new Date(order.purchasedAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{order.orgName}</div>
                      <div className="text-sm text-slate-500">{order.contactPerson} • {order.phone}</div>
                      <div className="flex flex-wrap gap-2 mt-2 items-center">
                        <Badge variant="neutral" className="bg-slate-100 text-slate-600">{order.sector}</Badge>
                        {order.website && (
                          <span className="text-xs font-mono text-slate-500 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">
                            {order.website}
                          </span>
                        )}
                      </div>
                      {order.businessDescription && (
                        <p className="text-xs text-slate-500 italic mt-1.5 max-w-xs line-clamp-2" title={order.businessDescription}>
                          &ldquo;{order.businessDescription}&rdquo;
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">{order.tierName}</div>
                      <div className="text-sm text-slate-500">{formatNaira(order.pricePaid)}</div>
                    </td>
                    <td className="px-6 py-4">
                      {editingBoothId === order.docId ? (
                        <div className="flex items-center gap-2">
                          <Input 
                            value={editingBoothValue}
                            onChange={(e) => setEditingBoothValue(e.target.value)}
                            className="w-24 text-sm"
                            placeholder="e.g. A12"
                            autoFocus
                          />
                          <Button size="sm" onClick={() => handleSaveBoothNumber(order.docId)}>
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingBoothId(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-medium text-slate-900">
                            {order.assignedBoothNumber || 'Unassigned'}
                          </span>
                          <button 
                            onClick={() => {
                              setEditingBoothId(order.docId);
                              setEditingBoothValue(order.assignedBoothNumber || '');
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            {order.assignedBoothNumber ? 'Edit' : 'Assign'}
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {order.status === 'ACTIVE' ? (
                        <Badge variant="active" className="bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]">Active</Badge>
                      ) : (
                        <Badge variant="revoked" className="bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5]">Revoked</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {order.status === 'ACTIVE' ? (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => toggleBoothRevocation(order.docId, order.status)}
                        >
                          <ShieldOff className="w-4 h-4 mr-1.5" />
                          Revoke Access
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => toggleBoothRevocation(order.docId, order.status)}
                        >
                          <ShieldCheck className="w-4 h-4 mr-1.5" />
                          Reinstate Access
                        </Button>
                      )}
                    </td>
                  </FadeIn>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create New Booth Tier">
        <form onSubmit={handleCreateTier} className="space-y-4">
          {addError && <Alert variant="error">{addError}</Alert>}

          <Input
            label="Tier Name"
            placeholder="e.g. Standard Meat and Agro Stall"
            value={newTier.name}
            onChange={(e) => setNewTier(prev => ({ ...prev, name: e.target.value }))}
            required
          />

          <Input
            label="Dimension"
            placeholder="e.g. 3m x 3m Demarcated Stall"
            value={newTier.dimension}
            onChange={(e) => setNewTier(prev => ({ ...prev, dimension: e.target.value }))}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Price (NGN)"
              type="number"
              placeholder="e.g. 150000"
              value={newTier.price}
              onChange={(e) => setNewTier(prev => ({ ...prev, price: e.target.value }))}
              required
            />
            <Input
              label="Available Stock"
              type="number"
              placeholder="e.g. 20"
              value={newTier.stock}
              onChange={(e) => setNewTier(prev => ({ ...prev, stock: e.target.value }))}
              required
            />
          </div>

          <Select
            label="Theme Color Palette"
            value={newTier.colorCode}
            onChange={(val) => setNewTier(prev => ({ ...prev, colorCode: val as any }))}
            options={[
              { value: 'sage', label: 'Sage Green (Standard / Agro)' },
              { value: 'champagne', label: 'Champagne Gold (Premium / Culinary)' },
              { value: 'slate', label: 'Slate Gray (Corporate / Machinery)' },
            ]}
          />

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">
              Inclusions & Perks (One per line)
            </label>
            <textarea
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-300 focus:outline-none focus:ring-2 focus:border-[#B8D8C5] focus:ring-[#B8D8C5]/20 min-h-[100px]"
              placeholder="Demarcated floor space&#10;Shared cold storage&#10;2 exhibitor badges"
              value={newTier.perksString}
              onChange={(e) => setNewTier(prev => ({ ...prev, perksString: e.target.value }))}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addLoading}>
              {addLoading ? 'Creating...' : 'Create Tier'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
