import { supabaseAdmin } from '@/lib/supabase-admin';
import { ReservationStatus } from '@/lib/types';

export type AdminOnboardResult = {
  success: boolean;
  userId?: string;
  tempPassword?: string;
  referenceId?: string;
  reservationId?: string;
  existingUser?: boolean;
  error?: string;
};

async function assignCategoryPermitNumber(reservationId: string, categoryId: string) {
  const { data: sequence, error: sequenceError } = await supabaseAdmin.rpc('allocate_exhibition_category_sequence', { p_category_id: categoryId });
  if (sequenceError || typeof sequence !== 'number') throw new Error(sequenceError?.message || 'Could not allocate a permit number.');
  const { error } = await supabaseAdmin.from('booth_reservations').update({ vendor_sequence: sequence }).eq('id', reservationId);
  if (error) throw new Error(error.message);
}

export async function adminCreateVendorAccount(data: {
  email: string;
  orgName: string;
  contactPerson: string;
  phone: string;
  sector: string;
  website?: string;
  businessDescription?: string;
  tierId: string;
  applicationData?: Record<string, string | number | boolean | null>;
}): Promise<AdminOnboardResult> {
  try {
    const tempPassword = 'NLF-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '!2026';

    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        orgName: data.orgName,
      },
    });

    if (createError || !authUser.user) {
      if (createError?.message?.includes('already registered')) {
        const { data: existingList } = await supabaseAdmin.auth.admin.listUsers();
        const existing = existingList?.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
        if (!existing) {
          throw new Error('User already exists but could not be located.');
        }
        return await adminCreateReservationForExistingUser(existing.id, data);
      }
      throw new Error(createError?.message || 'Failed to create user account');
    }

    const userId = authUser.user.id;

    await supabaseAdmin.from('profiles').upsert({
      id: userId,
      email: data.email,
      role: 'vendor',
      org_name: data.orgName,
      contact_person: data.contactPerson,
      phone: data.phone,
      sector: data.sector,
      website: data.website || '',
      business_description: data.businessDescription || '',
    });

    const { data: tier } = await supabaseAdmin
      .from('booth_tiers')
      .select('*')
      .eq('id', data.tierId)
      .single();

    if (!tier) {
      throw new Error('Tier not found');
    }

    const referenceId = 'BTH-' + Math.floor(1000 + Math.random() * 9000).toString();

    const { data: reservation, error: resErr } = await supabaseAdmin
      .from('booth_reservations')
      .insert({
        reference_id: referenceId,
        user_id: userId,
        tier_id: data.tierId,
        tier_name: tier.name,
        base_price: tier.price,
        additional_fees: 0,
        status: 'CONFIRMED_PAID',
        assigned_booth_number: 'Pending Assignment',
        payment_reference: 'ADMIN-MANUAL-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        application_data: data.applicationData || {},
      })
      .select()
      .single();

    if (resErr) {
      throw new Error(resErr.message);
    }

    await supabaseAdmin
      .from('booth_tiers')
      .update({ stock: Math.max(0, tier.stock - 1) })
      .eq('id', data.tierId);

    await assignCategoryPermitNumber(reservation.id, tier.category_id);

    return {
      success: true,
      userId,
      tempPassword,
      referenceId,
      reservationId: reservation.id,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to complete onboarding',
    };
  }
}

async function adminCreateReservationForExistingUser(userId: string, data: any): Promise<AdminOnboardResult> {
  const { data: tier } = await supabaseAdmin
    .from('booth_tiers')
    .select('*')
    .eq('id', data.tierId)
    .single();

  if (!tier) throw new Error('Tier not found');

  const referenceId = 'BTH-' + Math.floor(1000 + Math.random() * 9000).toString();

  const { data: reservation, error: resErr } = await supabaseAdmin
    .from('booth_reservations')
    .insert({
      reference_id: referenceId,
      user_id: userId,
      tier_id: data.tierId,
      tier_name: tier.name,
      base_price: tier.price,
      additional_fees: 0,
      status: 'CONFIRMED_PAID',
      assigned_booth_number: 'Pending Assignment',
      payment_reference: 'ADMIN-MANUAL-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      application_data: data.applicationData || {},
    })
    .select()
    .single();

  if (resErr) throw new Error(resErr.message);

  await supabaseAdmin
    .from('booth_tiers')
    .update({ stock: Math.max(0, tier.stock - 1) })
    .eq('id', data.tierId);

  await assignCategoryPermitNumber(reservation.id, tier.category_id);

  return {
    success: true,
    userId,
    referenceId,
    reservationId: reservation.id,
    existingUser: true,
  };
}
