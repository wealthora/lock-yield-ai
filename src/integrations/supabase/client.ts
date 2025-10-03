import { createClient } from '@supabase/supabase-js';

// Lovable Cloud automatically provides these credentials
// The values below are injected at build time
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials missing. Please configure in Cloud settings.');
  // Provide fallback to prevent app crash
  throw new Error('Supabase is not configured. Please contact support.');
}

export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  }
);
