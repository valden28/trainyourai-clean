import { getSupabaseClient } from '@/utils/supabaseClient'
const supabase = getSupabaseClient();

export async function getMervMessages(receiver_uid: string, status: 'unread' | 'read' = 'unread') {
  const { data, error } = await supabase
    .from('merv_messages')
    .select('*')
    .eq('receiver_uid', receiver_uid)
    .eq('status', status)
    .order('timestamp', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}