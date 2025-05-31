import { supabase } from '@/lib/supabaseServer'

type MervCategory =
  | "general"
  | "calendar"
  | "food"
  | "travel"
  | "vault_response"
  | "recipe"

export async function sendMervMessage(
  sender_uid: string,
  receiver_uid: string,
  message: string,
  category: MervCategory,
  assistant: string
){
  const { data, error } = await supabase
    .from('merv_messages')
    .insert({
      sender_uid,
      receiver_uid,
      message,
      category,
      assistant,
      status: 'unread'
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}