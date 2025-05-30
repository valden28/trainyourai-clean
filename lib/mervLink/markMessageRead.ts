import { supabase } from '@/lib/supabaseServer'

export async function markMessageRead(message_id: string) {
  const { error } = await supabase
    .from('merv_messages')
    .update({ status: 'read' })
    .eq('id', message_id)

  if (error) throw new Error(error.message)
}