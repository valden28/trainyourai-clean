'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { signOut } from 'next-auth/react'

export default function Header({ session }: { session: any }) {
  const pathname = usePathname()
  const user = session?.user

  const assistant = pathname.includes('chef')
    ? 'Chef Carlo'
    : pathname.includes('core')
    ? 'Core Assistant'
    : 'Merv'

  return (
    <header className="fixed top-0 w-full z-50 bg-white border-b shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 max-w-4xl mx-auto">
        <div>
          <Link href="/dashboard" className="font-bold text-lg">
            TrainYourAI · <span className="text-blue-600">{assistant}</span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <>
              <span className="text-sm text-gray-700">{user.name || 'User'}</span>
              <span className="text-green-500 text-xs">🟢 Vault Connected</span>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="text-sm bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
              >
                Log out
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}