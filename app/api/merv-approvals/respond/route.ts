// File: /app/api/merv-approvals/respond/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/utils/supabaseClient';
import { sendMervMessage } from '@/lib/mervLink/sendMessage';

const supabase = getSupabaseClient();

export async function POST(req: NextRequest) {
  const { id: approvalId, action } = await req.json();

  if (!approvalId || !['approve', 'deny'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('merv_approvals')
    .select('owner_uid, requester_uid, resource')
    .eq('id', approvalId)
    .single();

  if (error || !data) {
    console.error('❌ Failed to retrieve approval:', error?.message);
    return NextResponse.json({ error: 'Approval not found or failed to retrieve' }, { status: 500 });
  }

  // Type guard
  const { owner_uid, requester_uid, resource } = data as {
    owner_uid: string;
    requester_uid: string;
    resource: string;
  };

  const recipeName = resource.replace('recipes.', '').trim();

  const responseMessage =
    action === 'approve'
      ? `✅ Approved: ${recipeName} is now available.`
      : `❌ Request for ${recipeName} was denied.`;

  const result = await sendMervMessage(
    owner_uid,
    requester_uid,
    responseMessage,
    'vault_response',
    'chef'
  );

  console.log('✅ Approval response message sent:', result);

  return NextResponse.json({ success: true, message: result });
}