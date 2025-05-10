import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase' // optional, if you use types

export function createServerSupabaseClient() {
  return createServerComponentClient<Database>({ cookies })
}