export const PAYSTACK_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_PAYSTACK_PUBLISHABLE_KEY || 'pk_test_cfa5bab1b1f99e2abab6ca5b84fe71a183095603';

export async function verifyPaystackTransaction(reference: string) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY || '';

  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await res.json();
  if (!res.ok || !data.status || data.data?.status !== 'success') {
    throw new Error(data.message || 'Paystack payment verification failed.');
  }

  return data.data;
}
