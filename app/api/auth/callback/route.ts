// app/api/auth/callback/route.ts
import { handleAuth } from '@auth0/nextjs-auth0'

export const GET = handleAuth()