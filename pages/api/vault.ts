// pages/api/vault.ts
import { getSession } from '@auth0/nextjs-auth0';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req, res) {
  const session = await getSession(req, res);

  if (!session || !session.user) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const user = session.user;
  const user_uid = user.sub; // This is the Auth0 UID (ex: auth0|123abc)

  // Check for existing vault
  const { data, error } = await supabase
    .from('vaults_test')
    .select('*')
    .eq('user_uid', user_uid)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Supabase error:', error.message);
    return res.status(500).json({ error: 'Vault fetch failed' });
  }

  // If no vault exists, create one
  if (!data) {
    const { data: newVault, error: insertError } = await supabase
      .from('vaults_test')
      .insert({ user_uid })
      .select()
      .single();

    if (insertError) {
      console.error('Vault insert error:', insertError.message);
      return res.status(500).json({ error: 'Vault creation failed' });
    }

    return res.status(200).json(newVault);
  }

  // Return existing vault
  return res.status(200).json(data);
}