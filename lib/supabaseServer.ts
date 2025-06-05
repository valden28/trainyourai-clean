import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('❌ Supabase URL or Service Role Key not defined in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);