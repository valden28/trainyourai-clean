'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { useUser } from '@auth0/nextjs-auth0/client'

export default function Header() {
  const { user } = useUser()
  const pathname = usePathname()

  const assistant = pathname?.includes('chef')
    ? 'Chef Carlo'
    : pathname?.includes('core')
    ? 'Core Assistant'
    : 'Merv'

  return (
    <header className="fixed top-0 w-full z-50 bg-gray-100 border-b shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 max-w-5xl mx-auto">
        <div>
          <Link href="/dashboard" className="font-bold text-lg text-gray-800">
            TrainYourAI · <span className="text-blue-700">{assistant}</span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-sm text-gray-800">{user.name || 'User'}</span>
              <span className="text-green-600 text-xs font-medium">🟢 Vault Connected</span>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="text-sm bg-gray-800 text-white px-3 py-1 rounded hover:bg-black"
              >
                Log out
              </button>
            </>
          ) : (
            <Link
              href="/api/auth/login"
              className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}