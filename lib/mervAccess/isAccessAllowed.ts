import { getSupabaseClient } from '@/utils/supabaseClient';
const supabase = getSupabaseClient();

export async function isAccessAllowed(
  owner_uid: string,
  requester_uid: string,
  assistant: string,
  resource: string
): Promise<'auto' | 'manual' | 'denied'> {
  // Step 1: Check direct permission
  const { data: perm } = await supabase
    .from('merv_permissions')
    .select('approval_mode')
    .match({
      owner_uid,
      allowed_uid: requester_uid,
      assistant,
      resource,
    })
    .single();

  if (perm?.approval_mode === 'auto') return 'auto';
  if (perm?.approval_mode === 'manual') return 'manual';

  // Step 2: Check auto-share rules
  const { data: vaultSettings } = await supabase
    .from('vault_settings')
    .select('auto_share')
    .eq('user_uid', owner_uid)
    .single();

  // ✅ Explicit type assertion to allow dynamic keys
  const autoShareMap = vaultSettings?.auto_share as Record<string, boolean> | undefined;
  const isAuto = autoShareMap?.[assistant] === true;

  return isAuto ? 'auto' : 'denied';
}