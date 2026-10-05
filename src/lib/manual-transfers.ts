'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface ManualTransferAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  sortOrder: number;
}

export type ManualTransferStatus = 'PROCESSING' | 'RECEIVED' | 'NOT_RECEIVED';

export interface ManualTransferSubmission {
  id: string;
  reservationId: string;
  userId: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  amount: number;
  status: ManualTransferStatus;
  createdAt: string;
  reviewedAt?: string;
  categoryId?: string;
  reservation?: {
    categoryId?: string;
    referenceId: string;
    tierName: string;
    totalAmount: number;
    profile?: { orgName?: string; email?: string; phone?: string };
  };
}

function mapAccount(row: any): ManualTransferAccount {
  return {
    id: row.id,
    bankName: row.bank_name,
    accountName: row.account_name,
    accountNumber: row.account_number,
    sortOrder: Number(row.sort_order || 0),
  };
}

function mapSubmission(row: any): ManualTransferSubmission {
  return {
    id: row.id,
    reservationId: row.reservation_id,
    userId: row.user_id,
    bankName: row.bank_name,
    accountName: row.account_name,
    accountNumber: row.account_number,
    amount: Number(row.amount),
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at || undefined,
    reservation: row.reservation ? {
      categoryId: row.reservation.category_id,
      referenceId: row.reservation.reference_id,
      tierName: row.reservation.tier_name,
      totalAmount: Number(row.reservation.total_amount),
      profile: row.reservation.profile ? {
        orgName: row.reservation.profile.org_name,
        email: row.reservation.profile.email,
        phone: row.reservation.profile.phone,
      } : undefined,
    } : undefined,
  };
}

export function useManualTransferAccounts(enabled = true) {
  const [accounts, setAccounts] = useState<ManualTransferAccount[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setAccounts([]);
      setLoading(false);
      return;
    }
    const { data, error: queryError } = await supabase
      .from('manual_transfer_accounts')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (queryError) {
      setError(queryError.message);
    } else {
      setError(null);
      setAccounts((data || []).map(mapAccount));
    }
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    void refresh();
    if (!enabled) return;
    const channel = supabase
      .channel('manual-transfer-accounts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manual_transfer_accounts' }, () => void refresh())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [enabled, refresh]);

  return { accounts, loading, error, refresh };
}

export function useManualTransferSubmissions(reservationId?: string, enabled = true, categoryId?: string) {
  const [submissions, setSubmissions] = useState<ManualTransferSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setSubmissions([]);
      setLoading(false);
      return;
    }
    let query = supabase
      .from('manual_transfer_submissions')
      .select('*, reservation:booth_reservations!inner(category_id,reference_id,tier_name,total_amount,profile:profiles(org_name,email,phone))')
      .order('created_at', { ascending: false });
    if (reservationId) query = query.eq('reservation_id', reservationId);
    if (categoryId) query = query.eq('reservation.category_id', categoryId);
    const { data, error: queryError } = await query;
    if (queryError) {
      setError(queryError.message);
    } else {
      setError(null);
      setSubmissions((data || []).map(mapSubmission));
    }
    setLoading(false);
  }, [reservationId, enabled, categoryId]);

  useEffect(() => {
    void refresh();
    if (!enabled) return;
    let channel = supabase.channel(`manual-transfer-submissions-${reservationId || categoryId || 'admin'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manual_transfer_submissions' }, () => void refresh());
    if (reservationId) {
      channel = channel.on('postgres_changes', {
        event: '*', schema: 'public', table: 'booth_reservations', filter: `id=eq.${reservationId}`,
      }, () => void refresh());
    }
    channel.subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [reservationId, enabled, refresh, categoryId]);

  return { submissions, loading, error, refresh, latest: submissions[0] };
}

export async function saveManualTransferAccount(account: {
  id?: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  sortOrder: number;
}) {
  const bankName = account.bankName.trim();
  const accountName = account.accountName.trim();
  const accountNumber = account.accountNumber.trim();
  if (!bankName || !accountName || !/^[0-9]{6,20}$/.test(accountNumber)) {
    throw new Error('Enter the bank, account holder name, and a valid 6–20 digit account number.');
  }

  const values = {
    bank_name: bankName,
    account_name: accountName,
    account_number: accountNumber,
    sort_order: account.sortOrder,
    updated_at: new Date().toISOString(),
  };
  const query = account.id
    ? supabase.from('manual_transfer_accounts').update(values).eq('id', account.id)
    : supabase.from('manual_transfer_accounts').insert(values);
  const { error } = await query;
  if (error) {
    if (error.code === '23514') throw new Error(error.message);
    throw new Error(error.message || 'Could not save bank account.');
  }
}

export async function deleteManualTransferAccount(accountId: string) {
  const { error } = await supabase.from('manual_transfer_accounts').delete().eq('id', accountId);
  if (error) throw new Error(error.message || 'Could not remove bank account.');
}

export async function submitManualTransfer(reservationId: string, bankAccountId: string) {
  const { data, error } = await supabase.rpc('submit_manual_transfer', {
    p_reservation_id: reservationId,
    p_bank_account_id: bankAccountId,
  });
  if (error) throw new Error(error.message || 'Could not submit your transfer confirmation.');
  return data as string;
}

export async function reviewManualTransfer(submissionId: string, decision: 'RECEIVED' | 'WAITING' | 'NOT_RECEIVED') {
  const { data, error } = await supabase.rpc('review_manual_transfer', {
    p_submission_id: submissionId,
    p_decision: decision,
  });
  if (error) throw new Error(error.message || 'Could not update the transfer review.');
  return data as ManualTransferStatus;
}
