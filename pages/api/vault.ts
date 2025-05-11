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
  const session = await getSession(req, res);

  if (!session || !session.user) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const user = session.user;
  const user_uid = user.sub;

  const { data, error } = await supabase
    .from('vaults_test')
    .select('*')
    .eq('user_uid', user_uid)
    .single();

  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ error: 'Vault fetch failed', detail: error.message });
  }

  if (!data) {
    const { data: newVault, error: insertError } = await supabase
      .from('vaults_test')
      .insert({ user_uid })
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({ error: 'Vault creation failed', detail: insertError.message });
    }

    return res.status(200).json(newVault);
  }

  return res.status(200).json(data);
}