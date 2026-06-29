'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Send,
  History,
  Users,
  Tag,
  CreditCard,
  UserCircle,
  LogOut,
  MessageSquare,
  ShieldCheck,
  Zap,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================
// NAVIGATION
// ============================================================

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/sms', label: 'SMS Promotionnel', icon: Send },
  { href: '/transactionnel', label: 'SMS Transactionnel', icon: Zap },
  { href: '/otp', label: 'OTP', icon: ShieldCheck },
  { href: '/historique', label: 'Historique', icon: History },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/senders', label: 'Senders', icon: Tag },
]

// ============================================================
// TYPES
// ============================================================

interface SidebarProps {
  open: boolean
  onClose: () => void
}

// ============================================================
// COMPOSANT
// ============================================================

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' })
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* ---- Logo ---- */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-border shrink-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-3"
          onClick={onClose}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, #00D4FF 0%, #10B981 100%)',
            }}
          >
            <MessageSquare className="w-4 h-4 text-[#0A0A0F]" />
          </div>
          <span className="font-syne font-bold text-base text-foreground">
            TextoPro
          </span>
        </Link>

        {/* Bouton fermer — mobile seulement */}
        <button
          onClick={onClose}
          className="lg:hidden text-foreground-subtle hover:text-foreground transition-colors p-1"
          aria-label="Fermer le menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ---- Navigation principale ---- */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(href)

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
              <Icon
                className={cn(
                  'w-4 h-4 shrink-0',
                  isActive ? 'text-primary' : 'text-foreground-subtle'
                )}
              />
              {label}
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* ---- Recharge CTA ---- */}
      <div className="px-3 pb-3 shrink-0">
        <Link
          href="/recharge"
          onClick={onClose}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold w-full transition-all duration-150',
            pathname.startsWith('/recharge')
              ? 'bg-secondary/10 text-secondary'
              : 'bg-secondary/10 text-secondary hover:bg-secondary/20'
          )}
        >
          <CreditCard className="w-4 h-4 shrink-0" />
          Recharger les crédits
        </Link>
      </div>

      {/* ---- Séparateur ---- */}
      <div className="border-t border-border mx-3 shrink-0" />

      {/* ---- Profil + Déconnexion ---- */}
      <div className="px-3 py-3 space-y-0.5 shrink-0">
        <Link
          href="/profil"
          onClick={onClose}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
            pathname === '/profil'
              ? 'bg-primary/10 text-primary'
              : 'text-foreground-muted hover:text-foreground hover:bg-surface'
          )}
        >
          <UserCircle className="w-4 h-4 shrink-0 text-foreground-subtle" />
          Mon profil
        </Link>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground-muted hover:text-danger hover:bg-danger/8 transition-all duration-150 w-full text-left"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Déconnexion
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* ---- Overlay mobile ---- */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      {/* ---- Sidebar desktop (fixe) ---- */}
      <aside className="hidden lg:flex flex-col w-60 bg-surface border-r border-border h-screen sticky top-0 shrink-0">
        {sidebarContent}
      </aside>

      {/* ---- Sidebar mobile (drawer) ---- */}
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
