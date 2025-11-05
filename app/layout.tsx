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
      <body
        className={`
          ${inter.className}
          bg-neutral-50
          text-neutral-900
          antialiased
          selection:bg-blue-200
          selection:text-neutral-900
        `}
      >
        <UserProvider>
          <Header />
          <main
            className="
              max-w-6xl
              mx-auto
              p-6
              pt-24
              text-neutral-900
              leading-relaxed
            "
          >
            {children}
          </main>
        </UserProvider>
      </body>
    </html>
  )
}
