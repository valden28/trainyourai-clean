// app/layout.tsx
import '../app/globals.css'
import { Inter } from 'next/font/google'
import { UserProvider } from '@auth0/nextjs-auth0/client'
import Header from '../components/Header'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'TrainYourAI',
  description: 'AI that knows you.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-black`}>
        <UserProvider>
          <Header />
          <main className="p-4 max-w-4xl mx-auto pt-24">{children}</main>
        </UserProvider>
      </body>
    </html>
  )
}