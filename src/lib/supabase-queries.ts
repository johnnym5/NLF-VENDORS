'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  BoothTier,
  BoothReservation,
  CustomRequest,
  ReservationStatus,
  RequestStatus,
  UserProfile
} from './types';

export function useTiers(categoryId?: string) {
  const [tiers, setTiers] = useState<BoothTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchTiers() {
      let query = supabase.from('booth_tiers').select('*').order('price', { ascending: true });
      if (categoryId) query = query.eq('category_id', categoryId);
      const { data, error } = await query;

      if (error) {
        console.error('Error fetching tiers:', error);
        setError(new Error(error.message));
      } else if (data) {
        const mapped: BoothTier[] = data.map((t: any) => ({
          id: t.id,
          categoryId: t.category_id,
          name: t.name,
          dimension: t.dimension,
          colorCode: t.colorCode || t.color_code || 'sage',
          price: Number(t.price),
          stock: t.stock,
          initialStock: t.initial_stock || t.initialStock || t.stock,
          isLocked: Boolean(t.is_locked ?? t.isLocked ?? false),
          perks: t.perks || [],
          updatedAt: t.updated_at || t.updatedAt,
        }));
        setTiers(mapped);
      }
      setLoading(false);
    }

    fetchTiers();

    const channel = supabase
      .channel(`public:booth_tiers:${categoryId || 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booth_tiers' }, () => {
        fetchTiers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [categoryId]);

  return { tiers, loading, error };
}

export function useReservations(categoryId?: string) {
  const [reservations, setReservations] = useState<BoothReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchReservations() {
      let query = supabase
        .from('booth_reservations')
        .select(`
          *,
          profile:profiles(*),
          customRequests:custom_requests(*)
        `);
      if (categoryId) query = query.eq('category_id', categoryId);
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reservations:', error);
        setError(new Error(error.message));
      } else if (data) {
        const mapped: BoothReservation[] = data.map((r: any) => ({
          id: r.id,
          categoryId: r.category_id,
          applicationData: r.application_data || {},
          referenceId: r.reference_id,
          userId: r.user_id,
          tierId: r.tier_id,
          tierName: r.tier_name,
          basePrice: Number(r.base_price),
          additionalFees: Number(r.additional_fees || 0),
          totalAmount: Number(r.total_amount || r.base_price),
          status: r.status as ReservationStatus,
          assignedBoothNumber: r.assigned_booth_number || 'Pending Assignment',
          vendorSequence: r.vendor_sequence,
          paymentReference: r.payment_reference,
          paymentMethod: r.payment_method || undefined,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          profile: r.profile ? {
            id: r.profile.id,
            email: r.profile.email,
            role: r.profile.role,
            orgName: r.profile.org_name,
            contactPerson: r.profile.contact_person,
            phone: r.profile.phone,
            sector: r.profile.sector,
            website: r.profile.website,
            businessDescription: r.profile.business_description,
          } : undefined,
          customRequests: (r.customRequests || []).map((cr: any) => ({
            id: cr.id,
            reservationId: cr.reservation_id,
            requestText: cr.request_text,
            additionalFee: Number(cr.additional_fee || 0),
            status: cr.status as RequestStatus,
            adminNotes: cr.admin_notes,
            createdAt: cr.created_at,
          })),
        }));
        setReservations(mapped);
      }
      setLoading(false);
    }

    fetchReservations();

    const channel = supabase
      .channel('public:booth_reservations_all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booth_reservations' }, () => {
        fetchReservations();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_requests' }, () => {
        fetchReservations();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchReservations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [categoryId]);

  return { reservations, loading, error };
}

export function useVendorReservations(userId: string | undefined) {
  const [reservations, setReservations] = useState<BoothReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setReservations([]);
      setLoading(false);
      return;
    }

    async function fetchVendorReservations() {
      const { data, error } = await supabase
        .from('booth_reservations')
        .select(`
          *,
          profile:profiles(*),
          customRequests:custom_requests(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching vendor reservations:', error);
        setError(new Error(error.message));
      } else if (data) {
        const mapped: BoothReservation[] = data.map((r: any) => ({
          id: r.id,
          categoryId: r.category_id,
          applicationData: r.application_data || {},
          referenceId: r.reference_id,
          userId: r.user_id,
          tierId: r.tier_id,
          tierName: r.tier_name,
          basePrice: Number(r.base_price),
          additionalFees: Number(r.additional_fees || 0),
          totalAmount: Number(r.total_amount || r.base_price),
          status: r.status as ReservationStatus,
          assignedBoothNumber: r.assigned_booth_number || 'Pending Assignment',
          vendorSequence: r.vendor_sequence,
          paymentReference: r.payment_reference,
          paymentMethod: r.payment_method || undefined,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          profile: r.profile ? {
            id: r.profile.id,
            email: r.profile.email,
            role: r.profile.role,
            orgName: r.profile.org_name,
            contactPerson: r.profile.contact_person,
            phone: r.profile.phone,
            sector: r.profile.sector,
            website: r.profile.website,
            businessDescription: r.profile.business_description,
          } : undefined,
          customRequests: (r.customRequests || []).map((cr: any) => ({
            id: cr.id,
            reservationId: cr.reservation_id,
            requestText: cr.request_text,
            additionalFee: Number(cr.additional_fee || 0),
            status: cr.status as RequestStatus,
            adminNotes: cr.admin_notes,
            createdAt: cr.created_at,
          })),
        }));
        setReservations(mapped);
      }
      setLoading(false);
    }

    fetchVendorReservations();

    const channel = supabase
      .channel(`vendor_reservations_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booth_reservations', filter: `user_id=eq.${userId}` }, () => {
        fetchVendorReservations();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_requests' }, () => {
        fetchVendorReservations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { reservations, loading, error };
}

/**
 * Vendor Save Space / Reserve Stalls.
 * CRUCIAL RULE: Does NOT decrement tier stock!
 */
export async function saveBoothReservation(
  userId: string,
  tierId: string,
  orgDetails: {
    orgName: string;
    contactPerson: string;
    phone: string;
    sector?: string;
    email?: string;
    website?: string;
    businessDescription?: string;
  },
  customRequestText?: string,
  initialStatus: ReservationStatus = 'RESERVED_PENDING_APPROVAL',
  categoryId?: string,
  applicationData: Record<string, string | number | boolean | null> = {},
) {
  // 1. Upsert profile
  const profileValues: Record<string, unknown> = {
    id: userId,
    email: orgDetails.email || '',
    org_name: orgDetails.orgName,
    contact_person: orgDetails.contactPerson,
    phone: orgDetails.phone,
    updated_at: new Date().toISOString(),
  };
  if (orgDetails.sector) profileValues.sector = orgDetails.sector;
  if (orgDetails.website) profileValues.website = orgDetails.website;
  if (orgDetails.businessDescription) profileValues.business_description = orgDetails.businessDescription;
  const { error: profileErr } = await supabase.from('profiles').upsert(profileValues);
  if (profileErr) console.warn('Profile upsert warning:', profileErr);

  // 2. Fetch tier details
  const { data: tierList, error: tierError } = await supabase
    .from('booth_tiers')
    .select('*')
    .eq('id', tierId);

  const tierData = tierList && tierList.length > 0 ? tierList[0] : null;

  if (tierError || !tierData) {
    throw new Error('Selected booth tier does not exist.');
  }

  if (tierData.is_locked || tierData.isLocked) {
    throw new Error('This booth tier is currently locked for new reservations.');
  }
  if (categoryId && tierData.category_id !== categoryId) {
    throw new Error('The selected space does not belong to the active exhibition category.');
  }

  // Generate unique Reference ID (e.g. BTH-9412)
  const referenceId = 'BTH-' + Math.floor(1000 + Math.random() * 9000).toString();

  // 3. Create Reservation (Stock is NOT decremented)
  const { data: reservation, error: resError } = await supabase
    .from('booth_reservations')
    .insert({
      reference_id: referenceId,
      user_id: userId,
      tier_id: tierId,
      category_id: categoryId || tierData.category_id,
      application_data: applicationData,
      tier_name: tierData.name,
      base_price: tierData.price,
      additional_fees: 0,
      status: initialStatus,
      assigned_booth_number: 'Pending Assignment',
    })
    .select()
    .single();

  if (resError || !reservation) {
    console.error('Reservation creation error:', resError);
    throw new Error(resError?.message || 'Failed to save space.');
  }

  // 4. Create custom request if vendor provided specific needs
  if (customRequestText && customRequestText.trim().length > 0) {
    const { error: reqError } = await supabase.from('custom_requests').insert({
      reservation_id: reservation.id,
      request_text: customRequestText.trim(),
      additional_fee: 0,
      status: 'PENDING',
    });
    if (reqError) console.error('Custom request creation error:', reqError);
  }

  return reservation;
}

/**
 * Admin or Settlement Status Update.
 * Transitioning to CONFIRMED_PAID decrements tier stock safely and assigns vendor sequence.
 */
export async function updateReservationStatus(
  reservationId: string,
  newStatus: ReservationStatus,
  paymentReference?: string
) {
  // Use primary authenticated client carrying active user JWT session
  const { data: list, error: fetchErr } = await supabase
    .from('booth_reservations')
    .select('*')
    .eq('id', reservationId);

  if (fetchErr || !list || list.length === 0) {
    console.error('Fetch reservation error:', fetchErr);
    throw new Error('Reservation not found');
  }

  const currentRes = list[0];

  // Core Rule: If transitioning to CONFIRMED_PAID for the first time
  if (newStatus === 'CONFIRMED_PAID' && currentRes.status !== 'CONFIRMED_PAID') {
    const reference = paymentReference || 'ADMIN-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const { error: settlementError } = await supabase.rpc('settle_booth_payment', {
      p_reservation_id: reservationId,
      p_payment_reference: reference,
      p_payment_method: 'BANK_TRANSFER',
    });
    if (settlementError) throw new Error(settlementError.message);
    return;
  }

  // General status transition (e.g. APPROVED_PENDING_PAYMENT, REVOKED, RESERVED_PENDING_APPROVAL)
  const { error: updateErr } = await supabase
    .from('booth_reservations')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reservationId);

  if (updateErr) throw new Error(updateErr.message);
}

/**
 * Attach custom itemized fees in Naira and review custom requests.
 */
export async function addCustomSurcharge(
  reservationId: string,
  additionalFee: number,
  requestId?: string,
  adminNotes?: string,
  requestStatus: RequestStatus = 'APPROVED'
) {
  // 1. Fetch reservation
  const { data: list } = await supabase
    .from('booth_reservations')
    .select('additional_fees')
    .eq('id', reservationId);

  const res = list && list.length > 0 ? list[0] : null;
  const currentFee = Number(res?.additional_fees || 0);
  const newFee = Math.max(0, currentFee + additionalFee);

  await supabase
    .from('booth_reservations')
    .update({
      additional_fees: newFee,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reservationId);

  // 2. Update specific custom request if ID supplied
  if (requestId) {
    await supabase
      .from('custom_requests')
      .update({
        additional_fee: additionalFee,
        status: requestStatus,
        admin_notes: adminNotes || '',
      })
      .eq('id', requestId);
  }
}

/**
 * Assign or update physical booth location string (e.g. "Booth 04").
 */
export async function assignBoothNumber(reservationId: string, boothNumber: string) {
  const { error } = await supabase
    .from('booth_reservations')
    .update({
      assigned_booth_number: boothNumber || 'Pending Assignment',
      updated_at: new Date().toISOString(),
    })
    .eq('id', reservationId);

  if (error) throw error;
}

/**
 * Cancel / Delete a booth reservation (Allowed ONLY when status is Pending Approval or Cart).
 */
export async function deleteBoothReservation(reservationId: string, isAdminAction: boolean = false) {
  // Check reservation status
  const { data: list } = await supabase
    .from('booth_reservations')
    .select('status')
    .eq('id', reservationId);

  const res = list && list.length > 0 ? list[0] : null;

  if (!isAdminAction && res) {
    const isPending = res.status === 'RESERVED_PENDING_APPROVAL' || res.status === 'CART';
    if (!isPending) {
      throw new Error('Approved or confirmed booth reservations cannot be deleted.');
    }
  }

  // 1. Delete associated custom requests first
  await supabase.from('custom_requests').delete().eq('reservation_id', reservationId);

  // 2. Delete booth reservation
  const { data, error } = await supabase
    .from('booth_reservations')
    .delete()
    .eq('id', reservationId)
    .select();

  if (error) {
    console.error('Error deleting reservation:', error);
    throw new Error(error.message);
  }

  // Fallback to admin client if client-side RLS returned 0 rows
  if (!data || data.length === 0) {
    await supabaseAdmin.from('custom_requests').delete().eq('reservation_id', reservationId);
    const { error: adminErr } = await supabaseAdmin
      .from('booth_reservations')
      .delete()
      .eq('id', reservationId);

    if (adminErr) throw new Error(adminErr.message);
  }
}

/**
 * Manual Secretariat Organization Onboarding.
 */
export async function adminRegisterOrganization(data: {
  orgName: string;
  contactPerson: string;
  email: string;
  phone: string;
  sector: string;
  tierId: string;
  assignedBoothNumber: string;
  status: 'CONFIRMED_PAID' | 'APPROVED_PENDING_PAYMENT' | 'RESERVED_PENDING_APPROVAL';
  additionalFees?: number;
  customRequestText?: string;
  adminNotes?: string;
}) {
  let userId: string | null = null;

  const { data: existingList } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', data.email.toLowerCase().trim());

  const existingProfile = existingList && existingList.length > 0 ? existingList[0] : null;

  if (existingProfile) {
    userId = existingProfile.id;
  } else {
    userId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'usr_' + Math.random().toString(36).substring(2, 15);

    await supabase.from('profiles').insert({
      id: userId,
      email: data.email.toLowerCase().trim(),
      role: 'vendor',
      org_name: data.orgName,
      contact_person: data.contactPerson,
      phone: data.phone,
      sector: data.sector,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  const { data: tierList, error: tierErr } = await supabase
    .from('booth_tiers')
    .select('*')
    .eq('id', data.tierId);

  const tierData = tierList && tierList.length > 0 ? tierList[0] : null;

  if (tierErr || !tierData) {
    throw new Error('Selected booth tier does not exist.');
  }

  let vendorSequence: number | null = null;
  let paymentRef: string | null = null;

  if (data.status === 'CONFIRMED_PAID') {
    if (tierData.stock <= 0) {
      throw new Error('Cannot confirm order: Selected tier is out of stock.');
    }

    await supabase
      .from('booth_tiers')
      .update({ stock: Math.max(0, tierData.stock - 1) })
      .eq('id', data.tierId);

    const { data: allocatedSequence, error: sequenceError } = await supabase.rpc('allocate_exhibition_category_sequence', { p_category_id: tierData.category_id });
    if (sequenceError || typeof allocatedSequence !== 'number') throw new Error(sequenceError?.message || 'Could not allocate a category permit number.');
    vendorSequence = allocatedSequence;

    paymentRef = 'MANUAL-' + Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  const referenceId = 'BTH-' + Math.floor(1000 + Math.random() * 9000).toString();

  const { data: reservation, error: resErr } = await supabase
    .from('booth_reservations')
    .insert({
      reference_id: referenceId,
      user_id: userId,
      tier_id: data.tierId,
      tier_name: tierData.name,
      base_price: tierData.price,
      additional_fees: data.additionalFees || 0,
      status: data.status,
      assigned_booth_number: data.assignedBoothNumber || 'Pending Assignment',
      vendor_sequence: vendorSequence,
      payment_reference: paymentRef,
    })
    .select()
    .single();

  if (resErr || !reservation) {
    throw new Error(resErr?.message || 'Failed to onboard organization.');
  }

  if (data.customRequestText && data.customRequestText.trim().length > 0) {
    await supabase.from('custom_requests').insert({
      reservation_id: reservation.id,
      request_text: data.customRequestText.trim(),
      additional_fee: data.additionalFees || 0,
      status: 'APPROVED',
      admin_notes: data.adminNotes || 'Manual Onboarding',
    });
  }

  return reservation;
}

// Tier Management Functions
export async function updateTierPrice(tierId: string, newPrice: number) {
  const { error } = await supabase
    .from('booth_tiers')
    .update({ price: newPrice, updatedAt: new Date().toISOString() })
    .eq('id', tierId);

  if (error) {
    const { error: err2 } = await supabase
      .from('booth_tiers')
      .update({ price: newPrice })
      .eq('id', tierId);
    if (err2) throw error;
  }
}

export async function updateTierStock(tierId: string, newStock: number) {
  const { error } = await supabase
    .from('booth_tiers')
    .update({ stock: newStock, updatedAt: new Date().toISOString() })
    .eq('id', tierId);

  if (error) {
    const { error: err2 } = await supabase
      .from('booth_tiers')
      .update({ stock: newStock })
      .eq('id', tierId);
    if (err2) throw error;
  }
}

export async function toggleTierLock(tierId: string, currentLockState: boolean) {
  const { error } = await supabase
    .from('booth_tiers')
    .update({ isLocked: !currentLockState, is_locked: !currentLockState })
    .eq('id', tierId);

  if (error) {
    const { error: err2 } = await supabase
      .from('booth_tiers')
      .update({ isLocked: !currentLockState })
      .eq('id', tierId);
    if (err2) throw error;
  }
}

export async function addBoothTier(tierData: Omit<BoothTier, 'id' | 'updatedAt' | 'isLocked'>) {
  const tierId = 'tier_' + Math.random().toString(36).substring(2, 10);
  const camelCaseInsert = await supabase.from('booth_tiers').insert({
    id: tierId,
    category_id: tierData.categoryId,
    name: tierData.name,
    dimension: tierData.dimension,
    colorCode: tierData.colorCode,
    price: tierData.price,
    stock: tierData.stock,
    initialStock: tierData.initialStock,
    isLocked: false,
    perks: tierData.perks,
    updatedAt: new Date().toISOString(),
  });
  if (camelCaseInsert.error) {
    // Support databases initialized from supabase_schema.sql, which uses the
    // snake_case names, as well as the existing linked project schema.
    const snakeCaseInsert = await supabase.from('booth_tiers').insert({
      id: tierId,
      category_id: tierData.categoryId,
      name: tierData.name,
      dimension: tierData.dimension,
      color_code: tierData.colorCode,
      price: tierData.price,
      stock: tierData.stock,
      initial_stock: tierData.initialStock,
      is_locked: false,
      perks: tierData.perks,
    });
    if (snakeCaseInsert.error) throw camelCaseInsert.error;
  }
  return tierId;
}

export async function updateTierName(tierId: string, newName: string) {
  const { error } = await supabase
    .from('booth_tiers')
    .update({ name: newName })
    .eq('id', tierId);
  if (error) throw error;
}

export async function editBoothTierFull(tierId: string, updatedFields: Partial<Omit<BoothTier, 'id' | 'updatedAt'>>) {
  const updates: any = { updatedAt: new Date().toISOString() };
  if (updatedFields.name !== undefined) updates.name = updatedFields.name;
  if (updatedFields.dimension !== undefined) updates.dimension = updatedFields.dimension;
  if (updatedFields.colorCode !== undefined) {
    updates.colorCode = updatedFields.colorCode;
  }
  if (updatedFields.price !== undefined) updates.price = updatedFields.price;
  if (updatedFields.stock !== undefined) updates.stock = updatedFields.stock;
  if (updatedFields.initialStock !== undefined) updates.initialStock = updatedFields.initialStock;
  if (updatedFields.isLocked !== undefined) updates.isLocked = updatedFields.isLocked;
  if (updatedFields.perks !== undefined) updates.perks = updatedFields.perks;

  const { error } = await supabase.from('booth_tiers').update(updates).eq('id', tierId);
  if (error) {
    delete updates.updatedAt;
    const { error: err2 } = await supabase.from('booth_tiers').update(updates).eq('id', tierId);
    if (err2) throw error;
  }
}

export async function deleteBoothTier(tierId: string) {
  const { error } = await supabase.from('booth_tiers').delete().eq('id', tierId);
  if (error) throw error;
}
