// ✅ Header component with assistant switching fully restored — no Merv overwrite

'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@auth0/nextjs-auth0/client'

export default function Header() {
  const pathname = usePathname()
  const { user } = useUser()

  const assistant = pathname?.includes('chef')
    ? 'Chef Carlo'
    : pathname?.includes('core')
    ? 'Core Assistant'
    : 'Merv'

  return (
    <header className="fixed top-0 w-full z-50 bg-white border-b shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 max-w-5xl mx-auto">
        <div>
          <Link href="/dashboard" className="font-bold text-lg text-gray-800">
            TrainYourAI · <span className="text-blue-700">{assistant}</span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/chat" className="text-sm text-blue-600 hover:underline">
            Merv
          </Link>
          <Link href="/chat-core" className="text-sm text-gray-600 hover:underline">
            Core
          </Link>
          <Link href="/chat-chef" className="text-sm text-orange-600 hover:underline">
            Chef Carlo
          </Link>
          {user && (
            <>
              <span className="text-sm text-gray-800">{user.name || 'User'}</span>
              <a
                href="/api/auth/logout"
                className="text-sm text-gray-700 hover:underline"
              >
                Log out
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  )
}