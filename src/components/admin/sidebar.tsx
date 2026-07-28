'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Briefcase, Users, Languages, Package,
  Receipt, Settings, LogOut, Globe, Menu, X, UsersRound,
} from 'lucide-react'

const navItems = [
  { href: '/admin',                label: 'Dashboard',          icon: LayoutDashboard, exact: true },
  { href: '/admin/jobs',           label: 'Jobs',               icon: Briefcase       },
  { href: '/admin/clients',        label: 'Clients',            icon: Users           },
  { href: '/admin/translators',    label: 'Translators',        icon: Languages       },
  { href: '/admin/equipment',      label: 'Equipment',          icon: Package         },
  { href: '/admin/invoices',       label: 'Invoices / Payouts', icon: Receipt         },
  { href: '/admin/settings/team',  label: 'Team',               icon: UsersRound      },
  { href: '/admin/settings',       label: 'Settings',           icon: Settings,       exact: true },
]

function NavContent({ onNav }: { onNav?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <>
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-blue-300" />
          <span className="font-bold text-sm leading-tight">
            LA Translation<br />
            <span className="font-normal text-xs text-white/60">&amp; Interpretation</span>
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNav}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
                isActive ? 'bg-white/15 text-white font-medium' : 'text-white/70 hover:bg-white/10 hover:text-white',
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </>
  )
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar — hidden on mobile */}
      <aside className="hidden md:flex w-60 min-h-screen bg-[#1a1a2e] text-white flex-col flex-shrink-0">
        <NavContent />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#1a1a2e] text-white flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-blue-300" />
          <span className="font-bold text-sm">LA Translation</span>
        </div>
      </div>

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-[#1a1a2e] text-white flex flex-col transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-300" />
            <span className="font-bold text-sm">LA Translation</span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <NavContent onNav={() => setMobileOpen(false)} />
      </aside>
    </>
  )
}
