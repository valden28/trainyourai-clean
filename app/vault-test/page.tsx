'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabaseClient';

export default function VaultTestPage() {
  const [vault, setVault] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVault = async () => {
      const user_uid = localStorage.getItem('user_uid');
      if (!user_uid) {
        setVault('No UID in localStorage.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('vaults_test')
        .select('*')
        .eq('user_uid', user_uid)
        .single();

      if (error) {
        setVault(`Error: ${error.message}`);
      } else {
        setVault(data);
      }
      setLoading(false);
    };

    loadVault();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Vault Test</h1>
      {loading ? (
        <p>Loading vault...</p>
      ) : (
        <pre className="bg-gray-800 text-white p-4 rounded">
          {JSON.stringify(vault, null, 2)}
        </pre>
      )}
    </div>
  );
}