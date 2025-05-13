import { clerkMiddleware } from '@clerk/nextjs/server';
import { authMiddleware } from '@clerk/nextjs';

export default clerkMiddleware();

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)'], // Apply Clerk to all routes except static files
};