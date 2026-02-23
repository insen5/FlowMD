import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables are injected at build/runtime
const supabaseUrl = (process.env as any).SUPABASE_URL;
const supabaseAnonKey = (process.env as any).SUPABASE_ANON_KEY;

// Only initialize if we have the required credentials
export const supabase: SupabaseClient | null = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

if (!supabase) {
  console.warn("Supabase credentials missing. App running in 'Local Vault' mode with mock data.");
}
