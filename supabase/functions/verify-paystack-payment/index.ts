import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !paystackSecretKey) {
    console.error('Required Supabase or Paystack function secrets are missing.');
    return jsonResponse({ error: 'Payment verification is not configured on the server.' }, 503);
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Sign in to verify this payment.' }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return jsonResponse({ error: 'Your session has expired. Sign in and try again.' }, 401);

  let payload: { reference?: unknown; reservationId?: unknown };
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Request body must be valid JSON.' }, 400);
  }
  const { reference, reservationId } = payload;
  if (typeof reference !== 'string' || !reference || reference.length > 100 ||
      typeof reservationId !== 'string' || !reservationId) {
    return jsonResponse({ error: 'Payment reference and reservation are required.' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: reservation, error: reservationError } = await admin
    .from('booth_reservations')
    .select('id, user_id, status, total_amount, payment_reference')
    .eq('id', reservationId)
    .maybeSingle();
  if (reservationError) {
    console.error('Reservation lookup failed:', reservationError.message);
    return jsonResponse({ error: 'Could not load this reservation.' }, 500);
  }
  if (!reservation) return jsonResponse({ error: 'Reservation not found.' }, 404);
  if (reservation.user_id !== user.id) return jsonResponse({ error: 'You are not authorized to verify this reservation.' }, 403);
  if (reservation.status === 'CONFIRMED_PAID') {
    if (reservation.payment_reference === reference) return jsonResponse({ success: true, alreadyConfirmed: true });
    return jsonResponse({ error: 'This reservation is already confirmed with a different payment reference.' }, 409);
  }

  let paystackResponse: Response;
  try {
    paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${paystackSecretKey}`, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Paystack verification request failed:', error);
    return jsonResponse({ error: 'Could not reach Paystack to verify this payment. Try again shortly.' }, 502);
  }

  const verification = await paystackResponse.json().catch(() => null);
  if (!paystackResponse.ok || !verification?.status || verification.data?.status !== 'success') {
    return jsonResponse({ error: verification?.message || 'Paystack has not confirmed a successful payment.' }, 400);
  }
  const transaction = verification.data;
  const expectedAmount = Math.round(Number(reservation.total_amount) * 100);
  if (transaction.currency !== 'NGN' || Number(transaction.amount) !== expectedAmount) {
    return jsonResponse({ error: 'The verified payment amount or currency does not match this reservation.' }, 400);
  }
  if (transaction.customer?.email?.toLowerCase() !== user.email?.toLowerCase()) {
    return jsonResponse({ error: 'The Paystack payer email does not match the signed-in account.' }, 400);
  }

  const { error: settlementError } = await admin.rpc('settle_booth_payment', {
    p_reservation_id: reservationId,
    p_payment_reference: reference,
    p_payment_method: 'PAYSTACK',
  });

  if (settlementError) {
    console.error('Verified Paystack settlement failed:', settlementError.message);
    return jsonResponse({ error: settlementError.message || 'Payment was verified, but reservation update failed. Contact support with your payment reference.' }, 409);
  }

  return jsonResponse({ success: true });
});
