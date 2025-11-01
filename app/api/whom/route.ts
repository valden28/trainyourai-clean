import { NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0/edge';

export async function GET(req: Request) {
  const session = await getSession(req, NextResponse.next());
  return NextResponse.json({
    ok: !!session?.user,
    user_uid: session?.user?.sub ?? null,
    email: session?.user?.email ?? null,
  });
}
