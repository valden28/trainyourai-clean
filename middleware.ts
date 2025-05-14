import { getSession } from '@auth0/nextjs-auth0/edge';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const session = await getSession(req, NextResponse.next());

  if (!session?.user) {
    return NextResponse.redirect(new URL('/api/unauthorized', req.url));
  }

  const userId = session.user.sub;
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-user-id', userId);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ['/api/chat', '/chat-core', '/dashboard'],
};