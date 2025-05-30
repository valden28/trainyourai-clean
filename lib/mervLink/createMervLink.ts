// Server-side utility to create a MervLink + invite token
import { supabase } from '@/lib/supabaseServer'
import { nanoid } from 'nanoid'

export async function createMervLink(
  user_uid: string,
  link_type: 'personal' | 'business' | 'dating',
  permissions: Record<string, any> = {}
) {
  const token = nanoid(10)

  const { data, error } = await supabase
    .from('merv_links')
    .insert({
      user_uid,
      token,
      link_type,
      permissions,
      status: 'pending'
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  return {
    invite_url: `https://merv.chat/invite/${token}`,
    token,
    link: data
  }
}