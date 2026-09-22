'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  runTransaction,
  updateDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { BoothTier, BoothOrder } from './types';

export function useTiers() {
  const [tiers, setTiers] = useState<BoothTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const q = collection(db, 'booth_tiers');
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BoothTier));
        setTiers(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching tiers:', err);
        setError(err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  return { tiers, loading, error };
}

export function useOrders() {
  const [orders, setOrders] = useState<BoothOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const q = collection(db, 'booth_orders');
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() } as BoothOrder));
        setOrders(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching orders:', err);
        setError(err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
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
    const q = query(collection(db, 'booth_orders'), where('userId', '==', userId));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() } as BoothOrder));
        setOrders(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching vendor orders:', err);
        setError(err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [userId]);

  return { orders, loading, error };
}

export async function purchaseBoothTransaction(
  userId: string,
  orgDetails: { orgName: string; contactPerson: string; email: string; phone: string; sector: string; website?: string; businessDescription?: string },
  selectedTierId: string,
  customPaymentRef?: string
) {
  const tierRef = doc(db, 'booth_tiers', selectedTierId);
  const statsRef = doc(db, 'metadata', 'global_stats');
  const newOrderRef = doc(collection(db, 'booth_orders'));

  await runTransaction(db, async (transaction) => {
    const tierDoc = await transaction.get(tierRef);
    const statsDoc = await transaction.get(statsRef);

    if (!tierDoc.exists()) {
      throw new Error("Tier does not exist!");
    }
    
    const tierData = tierDoc.data() as BoothTier;
    if (tierData.isLocked) {
      throw new Error("This tier is currently locked.");
    }
    if (tierData.stock <= 0) {
      throw new Error("This tier is out of stock.");
    }

    // Get current sequence
    let currentSequence = 0;
    if (statsDoc.exists()) {
      currentSequence = statsDoc.data().totalOrders || 0;
    }
    const newSequence = currentSequence + 1;

    const newStock = tierData.stock - 1;
    transaction.update(tierRef, { stock: newStock });
    transaction.set(statsRef, { totalOrders: newSequence }, { merge: true });

    const orderId = 'BTH-' + Math.floor(1000 + Math.random() * 9000).toString();
    const paymentReference = customPaymentRef || 'SIM-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    
    const orderData: Omit<BoothOrder, 'docId'> = {
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
    
    transaction.set(newOrderRef, orderData);
  });

  return newOrderRef.id;
}

export async function assignBoothNumber(orderDocId: string, boothNumberString: string) {
  const orderRef = doc(db, 'booth_orders', orderDocId);
  await updateDoc(orderRef, { assignedBoothNumber: boothNumberString });
}

export async function toggleBoothRevocation(orderDocId: string, currentStatus: 'ACTIVE' | 'REVOKED') {
  const orderRef = doc(db, 'booth_orders', orderDocId);
  const newStatus = currentStatus === 'ACTIVE' ? 'REVOKED' : 'ACTIVE';
  await updateDoc(orderRef, { 
    status: newStatus,
    revokedAt: newStatus === 'REVOKED' ? new Date().toISOString() : null,
  });
}

export async function updateTierPrice(tierId: string, newPrice: number) {
  const tierRef = doc(db, 'booth_tiers', tierId);
  await updateDoc(tierRef, { price: newPrice });
}

export async function updateTierStock(tierId: string, newStock: number) {
  const tierRef = doc(db, 'booth_tiers', tierId);
  await updateDoc(tierRef, { stock: newStock });
}

export async function toggleTierLock(tierId: string, currentLockState: boolean) {
  const tierRef = doc(db, 'booth_tiers', tierId);
  await updateDoc(tierRef, { isLocked: !currentLockState });
}

export async function addBoothTier(tierData: Omit<BoothTier, 'id' | 'updatedAt' | 'isLocked'>) {
  const newRef = doc(collection(db, 'booth_tiers'));
  const fullData: BoothTier = {
    id: newRef.id,
    ...tierData,
    isLocked: false,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(newRef, fullData);
  return newRef.id;
}

export async function updateTierName(tierId: string, newName: string) {
  const tierRef = doc(db, 'booth_tiers', tierId);
  await updateDoc(tierRef, { name: newName });
}

