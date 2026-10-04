'use client';

import { FormEvent, useState } from 'react';
import { Banknote, CheckCircle2, Clock3, Landmark, Pencil, Plus, Trash2, XCircle } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
  deleteManualTransferAccount,
  ManualTransferAccount,
  ManualTransferSubmission,
  reviewManualTransfer,
  saveManualTransferAccount,
  useManualTransferAccounts,
  useManualTransferSubmissions,
} from '@/lib/manual-transfers';
import { formatNaira } from '@/lib/design-tokens';

const blankAccount = { bankName: '', accountName: '', accountNumber: '' };

export function ManualTransferManagement() {
  const { accounts, loading: accountsLoading, error: accountsError, refresh: refreshAccounts } = useManualTransferAccounts();
  const { submissions, loading: submissionsLoading, error: submissionsError, refresh: refreshSubmissions } = useManualTransferSubmissions();
  const [form, setForm] = useState(blankAccount);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<ManualTransferSubmission | null>(null);
  const [decisionBusy, setDecisionBusy] = useState(false);

  const processing = submissions.filter((item) => item.status === 'PROCESSING');
  const history = submissions.filter((item) => item.status !== 'PROCESSING');

  const startEdit = (account: ManualTransferAccount) => {
    setForm({ bankName: account.bankName, accountName: account.accountName, accountNumber: account.accountNumber });
    setEditingId(account.id);
    setFormOpen(true);
    setError(null);
  };

  const resetForm = () => {
    setForm(blankAccount);
    setEditingId(null);
    setFormOpen(false);
    setError(null);
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await saveManualTransferAccount({
        ...form,
        id: editingId || undefined,
        sortOrder: editingId ? accounts.find((account) => account.id === editingId)?.sortOrder || 0 : accounts.length,
      });
      await refreshAccounts();
      resetForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save the bank account.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (account: ManualTransferAccount) => {
    if (!confirm(`Remove ${account.bankName} account ending in ${account.accountNumber.slice(-4)}?`)) return;
    setError(null);
    try {
      await deleteManualTransferAccount(account.id);
      await refreshAccounts();
      if (editingId === account.id) resetForm();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not remove the bank account.');
    }
  };

  const handleDecision = async (decision: 'RECEIVED' | 'WAITING' | 'NOT_RECEIVED') => {
    if (!reviewing) return;
    setDecisionBusy(true);
    setError(null);
    try {
      await reviewManualTransfer(reviewing.id, decision);
      setReviewing(null);
      await refreshSubmissions();
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : 'Could not update the transfer review.');
    } finally {
      setDecisionBusy(false);
    }
  };

  return (
    <>
      <section className="space-y-6">
        <div className="rounded-xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-slate-600" />
              <div>
                <h2 className="font-heading text-lg font-bold text-slate-900">Manual Transfer Bank Accounts</h2>
                <p className="text-xs text-slate-500">Accounts shown to vendors whose booth is approved and awaiting payment. {accounts.length}/5 configured.</p>
              </div>
            </div>
            {!formOpen && accounts.length < 5 && (
              <Button variant="outline" size="sm" onClick={() => { setError(null); setFormOpen(true); }}>
                <Plus className="mr-1.5 h-4 w-4" /> Add Bank Account
              </Button>
            )}
          </div>

          {error && <Alert variant="error" className="mb-4">{error}</Alert>}
          {accountsError && <Alert variant="error" className="mb-4">{accountsError}</Alert>}

          {accountsLoading ? (
            <p className="text-sm text-slate-500">Loading bank accounts…</p>
          ) : accounts.length ? (
            <div className="mb-5 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {accounts.map((account) => (
                <div key={account.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="rounded-lg bg-emerald-50 p-2 text-emerald-800"><Banknote className="h-4 w-4" /></span>
                    <div>
                      <p className="font-semibold text-slate-900">{account.bankName}</p>
                      <p className="text-sm text-slate-600">{account.accountName}</p>
                      <p className="font-mono text-sm tracking-wide text-slate-700">{account.accountNumber}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => startEdit(account)}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit</Button>
                    <Button variant="outline" size="sm" onClick={() => void handleDelete(account)} className="text-rose-700"><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove</Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mb-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No bank accounts added yet. Vendors will only see Paystack until an account is configured.</p>
          )}

          {formOpen && (
            <form onSubmit={handleSave} className="grid grid-cols-1 gap-3 rounded-lg border border-emerald-100 bg-emerald-50/50 p-4 md:grid-cols-4">
              <Input label="Bank Name" value={form.bankName} onChange={(event) => setForm((current) => ({ ...current, bankName: event.target.value }))} required maxLength={100} placeholder="e.g. First Bank" />
              <Input label="Account Holder Name" value={form.accountName} onChange={(event) => setForm((current) => ({ ...current, accountName: event.target.value }))} required maxLength={150} placeholder="Name on account" />
              <Input label="Account Number" value={form.accountNumber} onChange={(event) => setForm((current) => ({ ...current, accountNumber: event.target.value.replace(/\D/g, '').slice(0, 20) }))} required inputMode="numeric" minLength={6} maxLength={20} placeholder="6–20 digits" />
              <div className="flex items-end gap-2">
                <Button type="submit" disabled={saving} className="flex-1 bg-[#1E4D38] text-white hover:bg-[#153627]">{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Account'}</Button>
                <Button type="button" variant="outline" onClick={resetForm} disabled={saving}>Cancel</Button>
              </div>
            </form>
          )}
        </div>

        <div className="rounded-xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-amber-700" />
            <div>
              <h2 className="font-heading text-lg font-bold text-slate-900">Manual Transfer Reviews</h2>
              <p className="text-xs text-slate-500">Verify incoming bank transfers before confirming receipt. Previous attempts remain in the history.</p>
            </div>
          </div>
          {submissionsError && <Alert variant="error" className="mb-4">{submissionsError}</Alert>}
          {submissionsLoading ? <p className="text-sm text-slate-500">Loading transfer requests…</p> : submissions.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No manual transfer requests yet.</p>
          ) : (
            <div className="space-y-6">
              {processing.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800">Awaiting confirmation ({processing.length})</h3>
                  {processing.map((item) => <TransferReviewCard key={item.id} item={item} onReview={() => setReviewing(item)} />)}
                </div>
              )}
              {history.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Previous transfer attempts ({history.length})</h3>
                  {history.map((item) => <TransferReviewCard key={item.id} item={item} onReview={() => setReviewing(item)} />)}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <Modal isOpen={!!reviewing} onClose={() => !decisionBusy && setReviewing(null)} title="Review Bank Transfer" size="sm">
        {reviewing && (
          <div className="space-y-5">
            <div className="rounded-lg bg-slate-50 p-4 text-sm">
              <p className="font-semibold text-slate-900">{reviewing.reservation?.profile?.orgName || 'Vendor'} · {reviewing.reservation?.referenceId}</p>
              <p className="mt-1 text-slate-600">{reviewing.reservation?.tierName} — {formatNaira(reviewing.amount)}</p>
              <p className="mt-2 text-xs text-slate-500">Transfer destination: {reviewing.bankName}, {reviewing.accountName}, {reviewing.accountNumber}</p>
            </div>
            <p className="text-sm text-slate-600">Check the receiving account before choosing the result.</p>
            <div className="grid gap-2">
              <Button disabled={decisionBusy || reviewing.status !== 'PROCESSING'} onClick={() => void handleDecision('RECEIVED')} className="bg-emerald-700 text-white hover:bg-emerald-800">
                <CheckCircle2 className="mr-2 h-4 w-4" /> Received
              </Button>
              <Button disabled={decisionBusy || reviewing.status !== 'PROCESSING'} onClick={() => void handleDecision('WAITING')} className="bg-amber-500 text-white hover:bg-amber-600">
                <Clock3 className="mr-2 h-4 w-4" /> Waiting — keep processing
              </Button>
              <Button disabled={decisionBusy || reviewing.status !== 'PROCESSING'} onClick={() => void handleDecision('NOT_RECEIVED')} className="bg-rose-700 text-white hover:bg-rose-800">
                <XCircle className="mr-2 h-4 w-4" /> Not received
              </Button>
              {reviewing.status !== 'PROCESSING' && <p className="text-center text-xs text-slate-500">This transfer has already been reviewed.</p>}
              {decisionBusy && <p className="text-center text-xs text-slate-500">Saving decision…</p>}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function TransferReviewCard({ item, onReview }: { item: ManualTransferSubmission; onReview: () => void }) {
  const statusStyle = item.status === 'PROCESSING'
    ? 'bg-amber-50 text-amber-800 border-amber-200'
    : item.status === 'RECEIVED'
    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : 'bg-rose-50 text-rose-800 border-rose-200';

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1 text-sm">
        <p className="font-semibold text-slate-900">{item.reservation?.profile?.orgName || 'Vendor'} · {item.reservation?.referenceId}</p>
        <p className="text-slate-600">{item.reservation?.tierName} · {formatNaira(item.amount)} · {item.bankName}</p>
        <p className="text-xs text-slate-500">Submitted {new Date(item.createdAt).toLocaleString()} · {item.reservation?.profile?.email || 'No email'}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyle}`}>{item.status === 'NOT_RECEIVED' ? 'Not received' : item.status === 'RECEIVED' ? 'Received' : 'Processing'}</span>
        <Button variant={item.status === 'PROCESSING' ? 'outline' : 'ghost'} size="sm" onClick={onReview}>
          {item.status === 'PROCESSING' ? 'Awaiting Confirmation' : 'View'}
        </Button>
      </div>
    </div>
  );
}
