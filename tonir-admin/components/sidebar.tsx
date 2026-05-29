'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', exact: true },
  { href: '/dashboard/venues', label: 'Venues', exact: false },
  { href: '/dashboard/reservations', label: 'Reservations', exact: false },
  { href: '/dashboard/users', label: 'Users', exact: false },
  { href: '/dashboard/guides', label: 'Guides', exact: false },
]

export function Sidebar({ adminName }: { adminName: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-56 bg-zinc-900 text-white flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="px-5 pt-6 pb-5 border-b border-zinc-800">
        <p className="text-base font-semibold tracking-tight">Tonir Admin</p>
        <p className="text-xs text-zinc-400 mt-0.5 truncate">{adminName}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4">
        <ul className="flex flex-col gap-0.5">
          {NAV.map(({ href, label, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                    active
                      ? 'bg-white/10 text-white font-medium'
                      : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                  }`}
                >
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Sign out */}
      <div className="px-3 pb-5 border-t border-zinc-800 pt-3">
        <button
          onClick={signOut}
          className="w-full flex items-center px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
