import { getSupabaseClient } from '@/utils/supabaseClient'
const supabase = getSupabaseClient();

export async function resolveContactName(owner_uid: string, name: string) {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('owner_uid', owner_uid)
      .ilike('name', name)
  
    console.log('📇 Looking up contact for:', name)
    console.log('🔍 Using owner_uid:', owner_uid)
    console.log('📁 Results:', data)
  
    if (error) {
      return { success: false, reason: 'error', message: error.message }
    }
  
    if (!data || data.length === 0) {
      return { success: false, reason: 'not_found' }
    }
  
    if (data.length > 1) {
      return { success: false, reason: 'ambiguous' }
    }
  
    return { success: true, uid: data[0].target_uid }
  }