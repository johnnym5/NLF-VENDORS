'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BoothTier, BoothOrder } from './types';

export function useTiers() {
  const [tiers, setTiers] = useState<BoothTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchTiers() {
      const { data, error } = await supabase
        .from('booth_tiers')
        .select('*')
        .order('price', { ascending: true });

      if (error) {
        console.error('Error fetching tiers from Supabase:', error);
        setError(new Error(error.message));
      } else if (data) {
        setTiers(data as BoothTier[]);
      }
      setLoading(false);
    }

    fetchTiers();

    const channel = supabase
      .channel('booth_tiers_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booth_tiers' }, () => {
        fetchTiers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { tiers, loading, error };
}

export function useOrders() {
  const [orders, setOrders] = useState<BoothOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      const { data, error } = await supabase
        .from('booth_orders')
        .select('*')
        .order('purchasedAt', { ascending: false });

      if (error) {
        console.error('Error fetching orders from Supabase:', error);
        setError(new Error(error.message));
      } else if (data) {
        setOrders(data as BoothOrder[]);
      }
      setLoading(false);
    }

    fetchOrders();

    const channel = supabase
      .channel('booth_orders_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booth_orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { orders, loading, error };
}

export function useVendorOrders(userId: string | undefined) {
  const [orders, setOrders] = useState<BoothOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setOrders([]);
      setLoading(false);
      return;
    }

    async function fetchVendorOrders() {
      const { data, error } = await supabase
        .from('booth_orders')
        .select('*')
        .eq('userId', userId)
        .order('purchasedAt', { ascending: true });

      if (error) {
        console.error('Error fetching vendor orders from Supabase:', error);
        setError(new Error(error.message));
      } else if (data) {
        setOrders(data as BoothOrder[]);
      }
      setLoading(false);
    }

    fetchVendorOrders();

    const channel = supabase
      .channel(`vendor_orders_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booth_orders', filter: `userId=eq.${userId}` }, () => {
        fetchVendorOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { orders, loading, error };
}

export async function purchaseBoothTransaction(
  userId: string,
  orgDetails: { orgName: string; contactPerson: string; email: string; phone: string; sector: string; website?: string; businessDescription?: string },
  selectedTierId: string,
  customPaymentRef?: string
) {
  const { data: tierData, error: tierError } = await supabase
    .from('booth_tiers')
    .select('*')
    .eq('id', selectedTierId)
    .single();

  if (tierError || !tierData) {
    throw new Error("Tier does not exist!");
  }
  if (tierData.isLocked) {
    throw new Error("This tier is currently locked.");
  }
  if (tierData.stock <= 0) {
    throw new Error("This tier is out of stock.");
  }

  const { data: statsData } = await supabase
    .from('metadata')
    .select('*')
    .eq('id', 'global_stats')
    .single();

  const currentSequence = statsData?.totalOrders || 0;
  const newSequence = currentSequence + 1;

  // Update tier stock
  const newStock = tierData.stock - 1;
  await supabase
    .from('booth_tiers')
    .update({ stock: newStock, updatedAt: new Date().toISOString() })
    .eq('id', selectedTierId);

  // Update metadata stats
  await supabase
    .from('metadata')
    .upsert({ id: 'global_stats', totalOrders: newSequence });

  const orderId = 'BTH-' + Math.floor(1000 + Math.random() * 9000).toString();
  const paymentReference = customPaymentRef || 'SIM-' + Math.random().toString(36).substring(2, 10).toUpperCase();

  const newDocId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);

  const orderData = {
    docId: newDocId,
    id: orderId,
    userId,
    ...orgDetails,
    tierId: selectedTierId,
    tierName: tierData.name,
    pricePaid: tierData.price,
    assignedBoothNumber: 'Pending Assignment',
    vendorSequence: newSequence,
    status: 'ACTIVE',
    paymentReference,
    purchasedAt: new Date().toISOString(),
  };

  const { data: insertedOrder, error: insertError } = await supabase
    .from('booth_orders')
    .insert(orderData)
    .select()
    .single();

  if (insertError) {
    console.error('Error inserting order into Supabase:', insertError);
    throw new Error(insertError.message);
  }

  return insertedOrder?.docId || newDocId;
}

export async function assignBoothNumber(orderDocId: string, boothNumberString: string) {
  const { error } = await supabase
    .from('booth_orders')
    .update({ assignedBoothNumber: boothNumberString })
    .eq('docId', orderDocId);
  if (error) throw error;
}

export async function toggleBoothRevocation(orderDocId: string, currentStatus: 'ACTIVE' | 'REVOKED') {
  const newStatus = currentStatus === 'ACTIVE' ? 'REVOKED' : 'ACTIVE';
  const { error } = await supabase
    .from('booth_orders')
    .update({
      status: newStatus,
      revokedAt: newStatus === 'REVOKED' ? new Date().toISOString() : null,
    })
    .eq('docId', orderDocId);
  if (error) throw error;
}

export async function updateTierPrice(tierId: string, newPrice: number) {
  const { error } = await supabase
    .from('booth_tiers')
    .update({ price: newPrice, updatedAt: new Date().toISOString() })
    .eq('id', tierId);
  if (error) throw error;
}

export async function updateTierStock(tierId: string, newStock: number) {
  const { error } = await supabase
    .from('booth_tiers')
    .update({ stock: newStock, updatedAt: new Date().toISOString() })
    .eq('id', tierId);
  if (error) throw error;
}

export async function toggleTierLock(tierId: string, currentLockState: boolean) {
  const { error } = await supabase
    .from('booth_tiers')
    .update({ isLocked: !currentLockState, updatedAt: new Date().toISOString() })
    .eq('id', tierId);
  if (error) throw error;
}

export async function addBoothTier(tierData: Omit<BoothTier, 'id' | 'updatedAt' | 'isLocked'>) {
  const tierId = 'tier_' + Math.random().toString(36).substring(2, 10);
  const fullData: BoothTier = {
    id: tierId,
    ...tierData,
    isLocked: false,
    updatedAt: new Date().toISOString(),
  };
  const { error } = await supabase.from('booth_tiers').insert(fullData);
  if (error) throw error;
  return tierId;
}

export async function updateTierName(tierId: string, newName: string) {
  const { error } = await supabase
    .from('booth_tiers')
    .update({ name: newName, updatedAt: new Date().toISOString() })
    .eq('id', tierId);
  if (error) throw error;
}

export async function editBoothTierFull(tierId: string, updatedFields: Partial<Omit<BoothTier, 'id' | 'updatedAt'>>) {
  const { error } = await supabase
    .from('booth_tiers')
    .update({
      ...updatedFields,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', tierId);
  if (error) throw error;
}

export async function deleteBoothTier(tierId: string) {
  const { error } = await supabase
    .from('booth_tiers')
    .delete()
    .eq('id', tierId);
  if (error) throw error;
}
