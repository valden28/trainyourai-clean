// /lib/auth.ts
import { type NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google" // or your provider

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  // Add more options as needed
}