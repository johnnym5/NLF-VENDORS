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
  toggleTierLock 
} from '@/lib/firestore';
import { FadeIn } from '@/components/ui/FadeIn';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  Settings, 
  Users, 
  Lock, 
  Unlock, 
  Save, 
  ShieldOff, 
  ShieldCheck,
  Search
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { tiers, loading: tiersLoading } = useTiers();
  const { orders, loading: ordersLoading } = useOrders();
  
  const [localPrices, setLocalPrices] = useState<Record<string, number>>({});
  const [localStocks, setLocalStocks] = useState<Record<string, number>>({});
  
  const [searchQuery, setSearchQuery] = useState('');
  
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

  const filteredOrders = orders?.filter(order => {
    const query = searchQuery.toLowerCase();
    return (
      order.orgName.toLowerCase().includes(query) ||
      order.contactPerson.toLowerCase().includes(query) ||
      order.id.toLowerCase().includes(query) ||
      (order.assignedBoothNumber && order.assignedBoothNumber.toLowerCase().includes(query))
    );
  }) || [];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Tier Configuration Section */}
      <section className="mb-12">
        <div className="mb-6">
          <h2 className="text-2xl font-heading font-semibold text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-slate-500" />
            Tier Configuration
          </h2>
          <p className="text-slate-600 mt-1">Manage pricing, inventory, and access controls for each booth tier.</p>
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
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input 
              placeholder="Search orders..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
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
                      <div className="font-mono text-sm text-slate-900">{order.id}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {new Date(order.purchasedAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{order.orgName}</div>
                      <div className="text-sm text-slate-500">{order.contactPerson} • {order.phone}</div>
                      <Badge variant="neutral" className="mt-2 bg-slate-100 text-slate-600">{order.sector}</Badge>
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
    </div>
  );
}
