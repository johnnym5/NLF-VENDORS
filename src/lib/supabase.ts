import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bqwohpjschaditdkrdra.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_HYjA-ZuSRTwNMTYBdsMfmA_Kvot5Ylg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
