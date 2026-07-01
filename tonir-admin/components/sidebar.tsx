'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { AdminRole } from '@/lib/current-admin'

const SUPER_ADMIN_NAV = [
  { href: '/dashboard', label: 'Dashboard', exact: true },
  { href: '/dashboard/analytics', label: 'Analytics', exact: false },
  { href: '/dashboard/venues', label: 'Venues', exact: false },
  { href: '/dashboard/reservations', label: 'Reservations', exact: false },
  { href: '/dashboard/users', label: 'Users', exact: false },
  { href: '/dashboard/yel', label: 'Yel Points', exact: false },
  { href: '/dashboard/prizes', label: 'Prizes', exact: false },
  { href: '/dashboard/guides', label: 'Guides', exact: false },
  { href: '/dashboard/home-sections', label: 'Home Sections', exact: false },
  { href: '/dashboard/reviews', label: 'Reviews', exact: false },
  { href: '/dashboard/concierge', label: 'Concierge', exact: false },
  { href: '/dashboard/redemption', label: 'Redeem', exact: false },
  { href: '/dashboard/notifications', label: 'Notifications', exact: false },
  { href: '/dashboard/admins', label: 'Admins', exact: false },
  { href: '/dashboard/activity', label: 'Activity Log', exact: false },
]

export function Sidebar({
  adminName,
  role,
  managedVenueIds,
}: {
  adminName: string
  role: AdminRole
  managedVenueIds: string[]
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  const nav =
    role === 'super_admin'
      ? SUPER_ADMIN_NAV
      : [
          { href: '/dashboard', label: 'Dashboard', exact: true },
          { href: '/dashboard/reservations', label: 'Reservations', exact: false },
          { href: '/dashboard/redemption', label: 'Redeem', exact: false },
          ...(managedVenueIds.length === 1
            ? [
                { href: `/dashboard/menus/${managedVenueIds[0]}`, label: 'Menu', exact: false },
                { href: `/dashboard/venues/${managedVenueIds[0]}`, label: 'My Venue', exact: false },
              ]
            : managedVenueIds.length > 1
            ? [{ href: '/dashboard/venues', label: 'My Venues', exact: false }]
            : []),
        ]

  return (
    <>
      {/* Region A — Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-12 bg-zinc-900 flex items-center px-4">
        <button
          onClick={() => setIsMobileOpen((prev) => !prev)}
          aria-label={isMobileOpen ? 'Close navigation' : 'Open navigation'}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 rounded-md"
        >
          <span className="block w-5 h-0.5 bg-white mb-1" />
          <span className="block w-5 h-0.5 bg-white mb-1" />
          <span className="block w-5 h-0.5 bg-white" />
        </button>
        <p className="text-sm font-semibold text-white mx-auto">Tonir Admin</p>
      </div>

      {/* Region B — The aside */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-zinc-900 text-white transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 lg:w-56 lg:flex lg:flex-col lg:h-full lg:shrink-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="px-5 pt-6 pb-5 border-b border-zinc-800">
          <p className="text-base font-semibold tracking-tight">Tonir Admin</p>
          <p className="text-xs text-zinc-400 mt-0.5 truncate">{adminName}</p>
          {role === 'super_admin' && (
            <span className="mt-1.5 inline-block text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium tracking-wide">
              SUPER ADMIN
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <ul className="flex flex-col gap-0.5">
            {nav.map(({ href, label, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href)
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 ${
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
            onClick={() =>
              startTransition(async () => {
                const supabase = createSupabaseBrowserClient()
                await supabase.auth.signOut()
                router.push('/login')
                router.refresh()
              })
            }
            disabled={isPending}
            className={`w-full flex items-center px-3 py-2 rounded-lg text-sm text-zinc-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 ${
              isPending ? 'opacity-60 cursor-not-allowed' : 'hover:bg-white/5 hover:text-zinc-200'
            }`}
          >
            {isPending ? (
              <>
                <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-zinc-500 border-t-zinc-200 animate-spin mr-2" />
                Signing out…
              </>
            ) : (
              'Sign out'
            )}
          </button>
        </div>
      </aside>

      {/* Region C — Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  )
}
