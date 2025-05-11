// /app/layout.tsx

import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TrainYourAI',
  description: 'Custom AI that thinks like you.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}