import { getSession } from '@auth0/nextjs-auth0/edge';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getSession(req, res);

  if (!session?.user) {
    return NextResponse.redirect(new URL('/', req.url));
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
    matcher: ['/chat-core', '/api/chat', '/dashboard', '/onboarding']
    
},