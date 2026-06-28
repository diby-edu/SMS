import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import {
  Users,
  Send,
  TrendingUp,
  Tag,
  MessageSquare,
  AlertTriangle,
  BarChart3,
} from 'lucide-react'
import StatsCard from '@/components/dashboard/StatsCard'
import { formatFCFA } from '@/lib/utils'
import { prisma } from '@/lib/prisma'
import { getLeTextoBalance } from '@/lib/letexto'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Admin — Tableau de bord' }
export const dynamic = 'force-dynamic'

const PAYS_LABELS: Record<string, string> = {
  CI: "Côte d'Ivoire", SN: 'Sénégal', ML: 'Mali', BF: 'Burkina Faso',
  GN: 'Guinée', TG: 'Togo', BJ: 'Bénin', NE: 'Niger',
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/dashboard')

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    totalClients,
    newClientsCeMois,
    totalMsgCeMois,
    totalCampCeMois,
    revenusAgg,
    revenusMoisAgg,
    sendersPending,
    config,
    smsByCountry,
    letextoBalance,
    smsStockClientsAgg,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'CLIENT' } }),
    prisma.user.count({ where: { role: 'CLIENT', created_at: { gte: startOfMonth } } }),
    prisma.message.count({ where: { created_at: { gte: startOfMonth } } }),
    prisma.campaign.count({ where: { created_at: { gte: startOfMonth } } }),
    prisma.transaction.aggregate({ where: { statut: 'SUCCESS' }, _sum: { montant_fcfa: true } }),
    prisma.transaction.aggregate({ where: { statut: 'SUCCESS', created_at: { gte: startOfMonth } }, _sum: { montant_fcfa: true } }),
    prisma.sender.count({ where: { statut: 'PENDING' } }),
    prisma.appConfig.findFirst(),
    prisma.user.groupBy({ by: ['pays'], where: { role: 'CLIENT' }, _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 6 }),
    getLeTextoBalance().catch(() => null),
    // SMS achetés par clients non encore envoyés (exposition réelle sur LeTexto)
    prisma.user.aggregate({ where: { role: 'CLIENT' }, _sum: { solde_sms: true } }),
  ])

  const revenusTotal = revenusAgg._sum.montant_fcfa ?? 0
  const revenusCeMois = revenusMoisAgg._sum.montant_fcfa ?? 0
  const smsStockClients = smsStockClientsAgg._sum.solde_sms ?? 0
  const margeLetexto = letextoBalance !== null ? letextoBalance - smsStockClients : null
  const alerteBalance = letextoBalance !== null && config && letextoBalance < config.letexto_balance_alert

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ---- Alerte solde LeTexto bas ---- */}
      {alerteBalance && (
        <div className="flex items-start gap-3 bg-danger/8 border border-danger/20 rounded-xl px-4 py-4">
          <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-danger font-semibold">
              Alerte : solde LeTexto bas
            </p>
            <p className="text-xs text-danger/70 mt-0.5">
              Solde actuel : <strong>{letextoBalance?.toLocaleString('fr-FR')} SMS</strong>.
              Seuil d&apos;alerte : {config?.letexto_balance_alert?.toLocaleString('fr-FR')} SMS.
              Rechargez votre compte LeTexto pour éviter les interruptions de service.
            </p>
          </div>
        </div>
      )}

      {/* ---- Alerte senders en attente ---- */}
      {sendersPending > 0 && (
        <div className="flex items-start gap-3 bg-warning/8 border border-warning/20 rounded-xl px-4 py-4">
          <Tag className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-warning font-semibold">
              {sendersPending} sender{sendersPending > 1 ? 's' : ''} en attente de validation
            </p>
          </div>
          <Link
            href="/admin/senders"
            className="text-xs text-warning font-semibold hover:text-warning/80 transition-colors shrink-0"
          >
            Valider →
          </Link>
        </div>
      )}

      {/* ---- Stats principales ---- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Clients total"
          value={totalClients}
          subtitle={`+${newClientsCeMois} ce mois`}
          icon={Users}
          iconColor="primary"
        />
        <StatsCard
          title="SMS ce mois"
          value={totalMsgCeMois + totalCampCeMois}
          subtitle={`${totalMsgCeMois} unitaires · ${totalCampCeMois} campagnes`}
          icon={Send}
          iconColor="secondary"
        />
        <StatsCard
          title="Revenus ce mois"
          value={formatFCFA(revenusCeMois)}
          subtitle={`Total : ${formatFCFA(revenusTotal)}`}
          icon={TrendingUp}
          iconColor="warning"
        />
        <StatsCard
          title="Solde LeTexto"
          value={letextoBalance !== null ? `${letextoBalance.toLocaleString('fr-FR')} SMS` : 'N/A'}
          subtitle={
            margeLetexto !== null
              ? `Stock clients : ${smsStockClients.toLocaleString('fr-FR')} SMS — Marge : ${margeLetexto.toLocaleString('fr-FR')} SMS`
              : 'Solde disponible'
          }
          icon={MessageSquare}
          iconColor={alerteBalance ? 'danger' : 'secondary'}
        />
      </div>

      {/* ---- Bas de page : pays + actions rapides ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Clients par pays */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-foreground-subtle" />
            <h3 className="font-syne font-semibold text-sm text-foreground">
              Clients par pays
            </h3>
          </div>
          <div className="space-y-3">
            {smsByCountry.map((g) => {
              const pct = totalClients > 0 ? Math.round((g._count.id / totalClients) * 100) : 0
              return (
                <div key={g.pays}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-foreground-muted">
                      {PAYS_LABELS[g.pays] || g.pays}
                    </span>
                    <span className="text-xs text-foreground font-semibold">
                      {g._count.id} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
            {smsByCountry.length === 0 && (
              <p className="text-xs text-foreground-subtle text-center py-4">
                Aucun client enregistré
              </p>
            )}
          </div>
        </div>

        {/* Actions rapides admin */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="font-syne font-semibold text-sm text-foreground mb-4">
            Actions rapides
          </h3>
          <div className="space-y-2">
            {[
              { href: '/admin/clients', label: 'Gérer les clients', icon: Users, count: totalClients },
              { href: '/admin/senders', label: 'Valider les senders', icon: Tag, count: sendersPending, badge: sendersPending > 0 },
              { href: '/admin/transactions', label: 'Voir les transactions', icon: TrendingUp },
              { href: '/admin/config', label: 'Configuration plateforme', icon: MessageSquare },
            ].map(({ href, label, icon: Icon, count, badge }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-background transition-colors group"
              >
                <Icon className="w-4 h-4 text-foreground-subtle group-hover:text-primary transition-colors" />
                <span className="text-sm text-foreground-muted group-hover:text-foreground transition-colors flex-1">
                  {label}
                </span>
                {badge && count !== undefined && count > 0 && (
                  <span className="text-xs bg-warning/10 text-warning border border-warning/20 px-2 py-0.5 rounded-full font-semibold">
                    {count}
                  </span>
                )}
                {!badge && count !== undefined && (
                  <span className="text-xs text-foreground-subtle">{count}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
