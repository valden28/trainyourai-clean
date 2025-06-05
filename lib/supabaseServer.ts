// /lib/supabaseServer.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  throw new Error('❌ Supabase URL or Service Role Key not defined in environment variables')
}

export const supabase = createClient(supabaseUrl, serviceKey)