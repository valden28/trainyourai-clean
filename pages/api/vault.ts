// Create new vault
const { data: newVault, error: insertError } = await supabase
  .from('vaults_test')
  .insert([{ user_uid }])
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
    message: insertError.message,
    hint: insertError.hint,
    code: insertError.code,
    details: insertError.details,
  });
}