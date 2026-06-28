import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getLeTextoBalance } from '@/lib/letexto'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    totalClients,
    newClientsCeMois,
    totalMessagesCeMois,
    totalCampaignsCeMois,
    revenusTotal,
    revenusCeMois,
    sendersPending,
    config,
    letextoBalance,
    smsByCountry,
    smsStockClients,
    smsAchetes,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'CLIENT' } }),
    prisma.user.count({
      where: { role: 'CLIENT', created_at: { gte: startOfMonth } },
    }),
    prisma.message.count({ where: { created_at: { gte: startOfMonth } } }),
    prisma.campaign.count({ where: { created_at: { gte: startOfMonth } } }),
    // Revenus = transactions SUCCESS * prix SMS
    prisma.transaction.aggregate({
      where: { statut: 'SUCCESS' },
      _sum: { montant_fcfa: true },
    }),
    prisma.transaction.aggregate({
      where: { statut: 'SUCCESS', created_at: { gte: startOfMonth } },
      _sum: { montant_fcfa: true },
    }),
    prisma.sender.count({ where: { statut: 'PENDING' } }),
    prisma.appConfig.findFirst(),
    getLeTextoBalance().catch(() => null),
    // SMS par pays (via les utilisateurs)
    prisma.user.groupBy({
      by: ['pays'],
      where: { role: 'CLIENT' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),
    // Total SMS en stock chez les clients (exposition LeTexto)
    prisma.user.aggregate({
      where: { role: 'CLIENT' },
      _sum: { solde_sms: true },
    }),
    // Total SMS achetés par les clients (toutes transactions SUCCESS)
    prisma.transaction.aggregate({
      where: { statut: 'SUCCESS' },
      _sum: { sms_credites: true },
    }),
  ])

  const alerteBalance =
    letextoBalance !== null &&
    config?.letexto_balance_alert !== undefined &&
    letextoBalance < config.letexto_balance_alert

  // SMS stock clients = SMS achetés mais pas encore envoyés (exposition LeTexto)
  const smsStockClientsTotal = smsStockClients._sum.solde_sms ?? 0
  // Marge réelle = solde LeTexto - stock SMS clients
  const margeLetexto = letextoBalance !== null ? letextoBalance - smsStockClientsTotal : null

  return NextResponse.json({
    totalClients,
    newClientsCeMois,
    totalMessagesCeMois,
    totalCampaignsCeMois,
    revenusTotal: revenusTotal._sum.montant_fcfa ?? 0,
    revenusCeMois: revenusCeMois._sum.montant_fcfa ?? 0,
    sendersPending,
    letextoBalance,
    alerteBalance,
    prixSMS: config?.prix_sms_fcfa ?? 30,
    smsByCountry: smsByCountry.map((g) => ({
      pays: g.pays,
      count: g._count.id,
    })),
    smsStockClients: smsStockClientsTotal,
    smsAchetesTotal: smsAchetes._sum.sms_credites ?? 0,
    margeLetexto,
  })
}
