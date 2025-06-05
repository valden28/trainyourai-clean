// File: /utils/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

let supabase: ReturnType<typeof createClient> | null = null;

export const getSupabaseClient = () => {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      throw new Error('❌ Supabase URL or Anon Key is missing from env');
    }

    supabase = createClient(url, anonKey);
  }

  return supabase;
};