import { getSession } from '@auth0/nextjs-auth0'
import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getSession(req, res)

    if (!session?.user) {
      console.warn('No session found')
      return res.status(401).json({ error: 'User not authenticated' })
    }

    const userUid = session.user.sub

    const { data, error } = await supabase
      .from('vaults_test')
      .select('*')
      .eq('user_uid', userUid)
      .single()

    if (error) {
      console.error('Supabase error:', error.message)
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ vault: data })
  } catch (err: any) {
    console.error('Unexpected error in /api/vault:', err)
    return res.status(500).json({ error: err.message || 'Unknown error' })
  }
}