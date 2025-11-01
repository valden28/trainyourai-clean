// File: app/api/whoami/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0/edge';

// Run on the Edge runtime (matches the Auth0 Edge helper)
export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const session = await getSession(req, NextResponse.next());
  return NextResponse.json({
    ok: !!session?.user,
    user_uid: session?.user?.sub ?? null,
    email: session?.user?.email ?? null,
  });
}
