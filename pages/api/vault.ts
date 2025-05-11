import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@auth0/nextjs-auth0';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getSession(req, res);

    if (!session || !session.user) {
      console.error('No session or user found.');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user_uid = session.user.sub;

    if (!user_uid) {
      console.error('Missing Auth0 UID.');
      return res.status(400).json({ error: 'Missing user UID from session.' });
    }

    console.log('User UID:', user_uid);

    // Try to fetch existing vault
    const { data, error } = await supabase
      .from('vaults_test')
      .select('*')
      .eq('user_uid', user_uid)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase fetch error:', error);
      return res.status(500).json({ error: 'Vault fetch failed', detail: error.message });
    }

    if (data) {
      return res.status(200).json(data);
    }

    // No existing vault — create new
    const { data: newVault, error: insertError } = await supabase
      .from('vaults_test')
      .insert({ user_uid })
      .select()
      .single();

    if (insertError) {
      console.error('Vault insert failed:', {
        message: insertError.message,
        hint: insertError.hint,
        code: insertError.code,
        details: insertError.details,
      });

      return res.status(500).json({
        error: 'Vault creation failed',
        detail: insertError.message,
        hint: insertError.hint,
        code: insertError.code,
        full: insertError,
      });
    }

    return res.status(200).json(newVault);
  } catch (err: any) {
    console.error('Unexpected vault error:', err);
    return res.status(500).json({ error: 'Unexpected server error', detail: err.message });
  }
}