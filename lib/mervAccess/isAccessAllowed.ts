import { supabase } from '@/lib/supabaseServer'

export async function isAccessAllowed(
  owner_uid: string,
  requester_uid: string,
  assistant: string,
  resource: string
): Promise<'auto' | 'manual' | 'denied'> {
  const { data, error } = await supabase
    .from('merv_permissions')
    .select('approval_mode')
    .eq('owner_uid', owner_uid)
    .eq('allowed_uid', requester_uid)
    .eq('assistant', assistant)
    .eq('resource', resource)
    .single()

  if (error || !data) {
    console.warn('🛑 No matching permission found:', {
      owner_uid,
      requester_uid,
      assistant,
      resource
    })
    return 'denied'
  }

  return data.approval_mode === 'auto' ? 'auto' : 'manual'
}