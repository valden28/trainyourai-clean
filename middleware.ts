// middleware.ts

import { getSession } from '@auth0/nextjs-auth0/edge';

export default async function middleware(req: any) {
  const res = new Response();
  const session = await getSession(req, res);

  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = session.user.sub;

  // Clone the request and add user ID to headers
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-user-id', userId);

  return new Response(null, {
    status: 200,
    headers: requestHeaders,
  });
}

export const config = {
  matcher: ['/api/chat'], // Only apply to this route for now
};