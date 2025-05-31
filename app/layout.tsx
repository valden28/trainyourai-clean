// app/layout.tsx
import '../app/globals.css'
import { Inter } from 'next/font/google'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Header from '@/components/Header'
import { UserProvider } from '@auth0/nextjs-auth0/client'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'TrainYourAI',
  description: 'AI that knows you.'
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-black`}>
        <UserProvider>
          <Header session={session} />
          <main className="p-4 max-w-4xl mx-auto pt-24">{children}</main>
        </UserProvider>
      </body>
    </html>
  )
}