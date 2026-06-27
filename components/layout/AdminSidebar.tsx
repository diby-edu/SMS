'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Users,
  Tag,
  CreditCard,
  Settings,
  MessageSquare,
  LogOut,
  X,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
  { href: '/admin/clients', label: 'Clients', icon: Users, exact: false },
  { href: '/admin/senders', label: 'Validation Senders', icon: Tag, exact: false },
  { href: '/admin/transactions', label: 'Transactions', icon: CreditCard, exact: false },
  { href: '/admin/config', label: 'Configuration', icon: Settings, exact: false },
]

interface AdminSidebarProps {
  open: boolean
  onClose: () => void
}

export default function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const pathname = usePathname()

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-border shrink-0">
        <Link href="/admin" className="flex items-center gap-3" onClick={onClose}>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #00D4FF 0%, #10B981 100%)' }}
          >
            <MessageSquare className="w-4 h-4 text-[#0A0A0F]" />
          </div>
          <div>
            <span className="font-syne font-bold text-sm text-foreground block">
              TextoPro
            </span>
            <span className="text-xs text-primary font-medium">Super Admin</span>
          </div>
        </Link>
        <button onClick={onClose} className="lg:hidden text-foreground-subtle p-1">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Badge admin */}
      <div className="mx-3 mt-3 mb-1">
        <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
          <Shield className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs text-primary font-medium">Mode Administration</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground-muted hover:text-foreground hover:bg-surface'
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-primary' : 'text-foreground-subtle')} />
              {label}
              {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
            </Link>
          )
        })}
      </nav>

      {/* Déconnexion */}
      <div className="px-3 py-3 border-t border-border shrink-0">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground-muted hover:text-danger hover:bg-danger/8 transition-all w-full text-left"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Déconnexion
        </button>
      </div>
    </div>
  )

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={onClose} />
      )}
      <aside className="hidden lg:flex flex-col w-60 bg-surface border-r border-border h-screen sticky top-0 shrink-0">
        {sidebarContent}
      </aside>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-surface border-r border-border flex flex-col lg:hidden',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
