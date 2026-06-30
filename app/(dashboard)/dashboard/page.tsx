import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  MessageSquare,
  Send,
  History,
  CreditCard,
  CheckCircle2,
} from 'lucide-react'
import StatsCard from '@/components/dashboard/StatsCard'
import ActivityChart from '@/components/dashboard/ActivityChart'
import RecentActivity from '@/components/dashboard/RecentActivity'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Tableau de bord' }

// Données toujours fraîches (pas de cache Next.js)
export const dynamic = 'force-dynamic'

// ============================================================
// HELPERS
// ============================================================

function buildActivityData(
  messages: { created_at: Date }[]
): { date: string; sms: number }[] {
  const now = new Date()
  const map = new Map<string, number>()

  // Initialiser les 30 derniers jours à 0
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    map.set(key, 0)
  }

  // Remplir avec les messages réels
  messages.forEach((m) => {
    const key = m.created_at.toISOString().split('T')[0]
    if (map.has(key)) {
      map.set(key, (map.get(key) ?? 0) + 1)
    }
  })

  // Formater pour le graphique
  return Array.from(map.entries()).map(([isoDate, sms]) => {
    const [, month, day] = isoDate.split('-')
    return { date: `${day}/${month}`, sms }
  })
}

// ============================================================
// PAGE
// ============================================================

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const userId = session.user.id
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // ---- Requêtes Prisma en parallèle ----
  const [
    smsCeMoisCount,
    deliveredCeMois,
    totalResolvedCeMois,
    messagesLast30Days,
    recentMessages,
    recentCampaigns,
    soldeActuel,
  ] = await Promise.all([
    // SMS envoyés ce mois
    prisma.message.count({
      where: { user_id: userId, created_at: { gte: startOfMonth } },
    }),
    // SMS livrés ce mois
    prisma.message.count({
      where: { user_id: userId, statut: 'DELIVERED', created_at: { gte: startOfMonth } },
    }),
    // SMS résolus (non PENDING) ce mois
    prisma.message.count({
      where: { user_id: userId, statut: { not: 'PENDING' }, created_at: { gte: startOfMonth } },
    }),
    // Activité 30 jours (seulement la date)
    prisma.message.findMany({
      where: { user_id: userId, created_at: { gte: thirtyDaysAgo } },
      select: { created_at: true },
      orderBy: { created_at: 'asc' },
    }),
    // 5 derniers messages
    prisma.message.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        sender: true,
        destinataire: true,
        contenu: true,
        statut: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
      take: 5,
    }),
    // 5 dernières campagnes
    prisma.campaign.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        label: true,
        sender_nom: true,
        nb_contacts: true,
        contenu: true,
        statut: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
      take: 5,
    }),
    // Solde actuel depuis la DB (plus fiable que le JWT)
    prisma.user.findUnique({
      where: { id: userId },
      select: { solde_sms: true },
    }),
  ])

  const tauxSucces = totalResolvedCeMois > 0
    ? Math.round((deliveredCeMois / totalResolvedCeMois) * 100)
    : null

  const activityData = buildActivityData(messagesLast30Days)

  // ---- Fusionner messages + campagnes pour l'activité récente ----
  const recentItems = [
    ...recentMessages.map((m) => ({
      id: m.id,
      type: 'MESSAGE' as const,
      destinataire: m.destinataire,
      contenu: m.contenu,
      statut: m.statut,
      sender: m.sender,
      created_at: m.created_at,
    })),
    ...recentCampaigns.map((c) => ({
      id: c.id,
      type: 'CAMPAIGN' as const,
      destinataire: `Campagne — ${c.nb_contacts} contacts`,
      contenu: c.contenu,
      statut: c.statut,
      sender: c.sender_nom,
      created_at: c.created_at,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 6)

  const soldeSMS = soldeActuel?.solde_sms ?? session.user.solde_sms
  const prenom = session.user.name?.split(' ')[0] ?? 'vous'

  // ============================================================
  // RENDU
  // ============================================================

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ---- En-tête de bienvenue ---- */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-syne font-bold text-xl text-foreground">
            Bonjour, {prenom}
          </h2>
          <p className="text-sm text-foreground-muted mt-0.5">
            Voici un aperçu de votre activité SMS
          </p>
        </div>

        {/* Alerte solde bas */}
        {soldeSMS === 0 && (
          <Link
            href="/recharge"
            className="flex items-center gap-2 bg-danger/10 text-danger border border-danger/20 rounded-lg px-4 py-2 text-xs font-semibold hover:bg-danger/15 transition-colors shrink-0"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Solde épuisé — Recharger
          </Link>
        )}
        {soldeSMS > 0 && soldeSMS < 20 && (
          <Link
            href="/recharge"
            className="flex items-center gap-2 bg-warning/10 text-warning border border-warning/20 rounded-lg px-4 py-2 text-xs font-semibold hover:bg-warning/15 transition-colors shrink-0"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Solde faible — Recharger
          </Link>
        )}
      </div>

      {/* ---- Cartes de statistiques ---- */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          title="Solde disponible"
          value={soldeSMS}
          subtitle="SMS restants"
          icon={MessageSquare}
          iconColor="primary"
        />
        <StatsCard
          title="SMS ce mois"
          value={smsCeMoisCount}
          subtitle="Depuis le 1er"
          icon={Send}
          iconColor="secondary"
        />
        <StatsCard
          title="Taux de succès"
          value={tauxSucces !== null ? `${tauxSucces}%` : '—'}
          subtitle={tauxSucces !== null ? `${deliveredCeMois} livrés ce mois` : 'Aucun envoi ce mois'}
          icon={CheckCircle2}
          iconColor="secondary"
        />
      </div>

      {/* ---- Actions rapides ---- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            href: '/sms',
            label: 'Envoyer un SMS',
            icon: Send,
            color: 'bg-primary/10 text-primary hover:bg-primary/15',
          },
          {
            href: '/historique',
            label: 'Historique',
            icon: History,
            color: 'bg-secondary/10 text-secondary hover:bg-secondary/15',
          },
          {
            href: '/contacts',
            label: 'Mes contacts',
            icon: MessageSquare,
            color: 'bg-warning/10 text-warning hover:bg-warning/15',
          },
          {
            href: '/recharge',
            label: 'Recharger',
            icon: CreditCard,
            color: 'bg-border text-foreground-muted hover:bg-[#252535]',
          },
        ].map(({ href, label, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border border-border text-sm font-medium transition-all duration-150 ${color}`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{label}</span>
          </Link>
        ))}
      </div>

      {/* ---- Graphique + Activité récente ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Graphique (3/5) */}
        <div className="lg:col-span-3">
          <ActivityChart data={activityData} />
        </div>

        {/* Activité récente (2/5) */}
        <div className="lg:col-span-2">
          <RecentActivity items={recentItems} />
        </div>
      </div>
    </div>
  )
}
