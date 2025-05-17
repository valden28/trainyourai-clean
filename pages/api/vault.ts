// pages/api/vault.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@auth0/nextjs-auth0';
import { supabaseServer as supabase } from '@/lib/supabaseServer';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getSession(req, res);

    if (!session || !session.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user_uid = session.user.sub;
    if (!user_uid) {
      return res.status(400).json({ error: 'Missing user UID from session.' });
    }

    // Try to fetch existing vault
    const { data, error } = await supabase
      .from('vaults_test')
      .select('*')
      .eq('user_uid', user_uid)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({
        error: 'Vault fetch failed',
        detail: error.message,
      });
    }

    if (data) {
      return res.status(200).json(data);
    }

    // No existing vault, create one
    const { data: newVault, error: insertError } = await supabase
      .from('vaults_test')
      .insert([{ user_uid }])
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({
        error: 'Vault creation failed',
        message: insertError.message,
        hint: insertError.hint,
        code: insertError.code,
        details: insertError.details,
      });
    }

    return res.status(200).json(newVault);
  } catch (err: any) {
    return res.status(500).json({
      error: 'Unexpected server error',
      detail: err.message || 'Unknown error',
    });
  }
}