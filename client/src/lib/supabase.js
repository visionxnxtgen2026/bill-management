import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

/**
 * Centralized Supabase Client.
 * Safe for client-side use with public/publishable credentials.
 * The frontend never accesses or reads DATABASE_URL.
 */
export const supabase = (supabaseUrl && supabasePublishableKey)
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null;

export const supabaseConfig = {
  url: supabaseUrl,
  hasKey: Boolean(supabasePublishableKey),
};

export default supabase;
