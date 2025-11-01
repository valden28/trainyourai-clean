// ✅ middleware.ts — Auth0 session guard for app pages (not API routes)
import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge';

export default withMiddlewareAuthRequired();

// 👇 Only run middleware on real app pages, not API or static assets
export const config = {
  matcher: [
    // Everything EXCEPT api routes, Next.js assets, favicon, and public files
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
