import { getSession } from '@auth0/nextjs-auth0'
import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res)

  if (!session?.user) {
    return res.status(401).json({ error: 'User not authenticated' })
  }

  const userUid = session.user.sub

  const { data, error } = await supabase
    .from('vaults_test')
    .select('*')
    .eq('user_uid', userUid)
    .single()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ vault: data })
}