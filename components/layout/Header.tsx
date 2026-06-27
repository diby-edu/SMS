'use client'

import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Menu, MessageSquare, CreditCard, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================
// MAPPING PATHNAME → TITRE
// ============================================================

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Tableau de bord',
  '/sms': 'Envoyer un SMS',
  '/campagnes': 'Campagnes SMS',
  '/historique': 'Historique des envois',
  '/contacts': 'Gestion des contacts',
  '/senders': 'Gestion des Senders',
  '/recharge': 'Recharger les crédits',
  '/profil': 'Mon profil',
}

function getPageTitle(pathname: string): string {
  // Correspondance exacte
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  // Correspondance par préfixe (ex: /campagnes/nouvelle)
  const match = Object.entries(PAGE_TITLES).find(([key]) =>
    pathname.startsWith(key) && key !== '/dashboard'
  )
  return match ? match[1] : 'TextoPro'
}

// ============================================================
// PROPS
// ============================================================

interface HeaderProps {
  onMenuClick: () => void
}

// ============================================================
// COMPOSANT
// ============================================================

export default function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname()
  const { data: session } = useSession()

  const pageTitle = getPageTitle(pathname)
  const soldeSMS = session?.user?.solde_sms ?? 0
  const prenom = session?.user?.name?.split(' ')[0] ?? ''

  // Couleur du badge solde selon le niveau
  const soldeColor =
    soldeSMS === 0
      ? 'text-danger bg-danger/10 border-danger/20'
      : soldeSMS < 20
      ? 'text-warning bg-warning/10 border-warning/20'
      : 'text-primary bg-primary/10 border-primary/20'

  return (
    <header className="h-16 bg-surface border-b border-border flex items-center gap-4 px-4 md:px-6 shrink-0 sticky top-0 z-20">
      {/* ---- Hamburger (mobile) ---- */}
      <button
        onClick={onMenuClick}
        className="lg:hidden text-foreground-subtle hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-border"
        aria-label="Ouvrir le menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* ---- Titre de la page ---- */}
      <div className="flex-1 min-w-0">
        <h1 className="font-syne font-semibold text-base text-foreground truncate">
          {pageTitle}
        </h1>
      </div>

      {/* ---- Actions droite ---- */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* Badge solde SMS */}
        <div
          className={cn(
            'hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold',
            soldeColor
          )}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>
            {soldeSMS.toLocaleString('fr-FR')}{' '}
            <span className="font-normal opacity-70">SMS</span>
          </span>
        </div>

        {/* Bouton recharge */}
        <Link
          href="/recharge"
          className="flex items-center gap-1.5 bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors px-3 py-1.5 rounded-lg text-xs font-semibold border border-secondary/20"
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Recharger</span>
        </Link>

        {/* Avatar utilisateur */}
        <Link
          href="/profil"
          className="flex items-center gap-2 hover:bg-border transition-colors px-2.5 py-1.5 rounded-lg"
        >
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
            {prenom.charAt(0).toUpperCase()}
          </div>
          <span className="hidden md:inline text-sm text-foreground-muted font-medium truncate max-w-[100px]">
            {prenom}
          </span>
        </Link>
      </div>
    </header>
  )
}
