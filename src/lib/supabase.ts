import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://diimxnsmrhhouflgoqib.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_d9O_G1SMxCpY9wtaC9b_qQ_i9OMTTa3';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
