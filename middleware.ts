// middleware.ts

import { getSession } from '@auth0/nextjs-auth0/edge';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getSession(req, res);

  if (!session?.user) {
    return NextResponse.redirect(new URL('/api/unauthorized', req.url));
  }

  const userId = session.user.sub;
  req.headers.set('x-user-id', userId); // attach to request

  return res;
}

export const config = {
  matcher: ['/api/chat'], // only run this for /api/chat
};