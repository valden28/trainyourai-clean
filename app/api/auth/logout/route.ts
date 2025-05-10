// app/api/auth/logout/route.ts
import { handleLogout } from '@auth0/nextjs-auth0'

export const GET = handleLogout()