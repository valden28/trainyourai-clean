import { getSupabaseClient } from '@/utils/supabaseClient'
const supabase = getSupabaseClient()

export async function isAccessAllowed(
  owner_uid: string,
  requester_uid: string,
  assistant: string,
  resource: string
): Promise<'auto' | 'manual' | 'denied'> {
  // Step 1: direct permission entry
  const { data: perm } = await supabase
    .from('merv_permissions')
    .select('approval_mode')
    .match({
      owner_uid,
      allowed_uid: requester_uid,
      assistant,
      resource,
    })
    .single()

  if (perm?.approval_mode === 'auto') return 'auto'
  if (perm?.approval_mode === 'manual') return 'manual'

  // Step 2: tenant-level or vault auto-share rule
  const { data: vaultSettings } = await supabase
    .from('vault_settings')
    .select('auto_share, tenant_id')
    .eq('user_uid', owner_uid)
    .single()

  const autoShareMap =
    (vaultSettings?.auto_share as Record<string, boolean>) ?? {}
  const isAuto = autoShareMap?.[assistant] === true

  // Step 3: contact-vault exception
  // allow auto if the resource is a contact that belongs to the same tenant or owner
  if (resource?.startsWith('contact:')) {
    const contactId = resource.replace('contact:', '').trim()

    const { data: contact } = await supabase
      .from('contacts')
      .select('tenant_id, owner_uid')
      .eq('id', contactId)
      .maybeSingle()

    // ✅ same tenant or same owner gets auto access
    if (
      contact &&
      (contact.owner_uid === owner_uid ||
        contact.tenant_id === vaultSettings?.tenant_id)
    ) {
      return 'auto'
    }
  }

  return isAuto ? 'auto' : 'denied'
}
