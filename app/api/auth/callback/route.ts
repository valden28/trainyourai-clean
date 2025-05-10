// app/api/auth/callback/route.ts
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // You can eventually parse Auth0 response params here if needed

  // For now, we simply redirect the user to the chat page after login
  const redirectUrl = new URL('/chat', request.url)
  return NextResponse.redirect(redirectUrl)
}
