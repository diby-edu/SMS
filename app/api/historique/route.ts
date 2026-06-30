import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

/**
 * GET /api/historique
 * Retourne la liste paginée et filtrée des messages + campagnes + OTP
 * type: 'all' | 'marketing' | 'transactionnel' | 'otp'
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = 20
  const skip = (page - 1) * limit
  const type = searchParams.get('type') || 'all'
  const statut = searchParams.get('statut') || ''
  const dateFrom = searchParams.get('dateFrom') || ''
  const dateTo = searchParams.get('dateTo') || ''
  const userId = session.user.id

  // Filtre de date commun
  const dateFilter: { gte?: Date; lte?: Date } = {}
  if (dateFrom) dateFilter.gte = new Date(dateFrom)
  if (dateTo) {
    const d = new Date(dateTo)
    d.setHours(23, 59, 59, 999)
    dateFilter.lte = d
  }
  const hasDateFilter = Object.keys(dateFilter).length > 0

  type HistoryItem = {
    id: string
    source: 'MARKETING' | 'CAMPAIGN' | 'TRANSACTIONNEL' | 'OTP'
    sender: string
    destinataire: string
    contenu: string
    statut: string
    cost_sms: number
    created_at: Date
  }

  const results: HistoryItem[] = []

  // ── SMS Marketing unitaire (Message sans clé API) ──────────────────────
  if (type === 'all' || type === 'marketing') {
    const where: Prisma.MessageWhereInput = {
      user_id: userId,
      api_key_id: null,
      ...(statut && { statut: statut as 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' }),
      ...(hasDateFilter && { created_at: dateFilter }),
    }
    const rows = await prisma.message.findMany({
      where,
      select: { id: true, sender: true, destinataire: true, contenu: true, statut: true, cost_sms: true, created_at: true },
    })
    rows.forEach(m => results.push({ ...m, source: 'MARKETING' }))
  }

  // ── Campagnes (toujours Marketing) ────────────────────────────────────
  if (type === 'all' || type === 'marketing') {
    const where: Prisma.CampaignWhereInput = {
      user_id: userId,
      ...(hasDateFilter && { created_at: dateFilter }),
    }
    const rows = await prisma.campaign.findMany({
      where,
      select: { id: true, sender_nom: true, nb_contacts: true, contenu: true, statut: true, cost_sms: true, created_at: true, label: true },
    })
    rows.forEach(c => results.push({
      id: c.id,
      source: 'CAMPAIGN',
      sender: c.sender_nom,
      destinataire: `${c.label} — ${c.nb_contacts} contacts`,
      contenu: c.contenu,
      statut: c.statut,
      cost_sms: c.cost_sms,
      created_at: c.created_at,
    }))
  }

  // ── SMS Transactionnel (Message avec clé API) ──────────────────────────
  if (type === 'all' || type === 'transactionnel') {
    const where: Prisma.MessageWhereInput = {
      user_id: userId,
      api_key_id: { not: null },
      ...(statut && { statut: statut as 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' }),
      ...(hasDateFilter && { created_at: dateFilter }),
    }
    const rows = await prisma.message.findMany({
      where,
      select: { id: true, sender: true, destinataire: true, contenu: true, statut: true, cost_sms: true, created_at: true },
    })
    rows.forEach(m => results.push({ ...m, source: 'TRANSACTIONNEL' }))
  }

  // ── OTP ───────────────────────────────────────────────────────────────
  if (type === 'all' || type === 'otp') {
    // Récupérer les clés API de l'utilisateur
    const userApiKeys = await prisma.apiKey.findMany({
      where: { user_id: userId },
      select: { id: true },
    })
    const keyIds = userApiKeys.map(k => k.id)

    if (keyIds.length > 0) {
      const where: Prisma.OtpCodeWhereInput = {
        api_key_id: { in: keyIds },
        ...(hasDateFilter && { created_at: dateFilter }),
      }
      const rows = await prisma.otpCode.findMany({
        where,
        select: { id: true, phone: true, statut: true, created_at: true },
      })
      // Mapper le statut OTP vers le statut message
      const otpStatutMap: Record<string, string> = {
        VERIFIED: 'DELIVERED',
        PENDING: 'PENDING',
        EXPIRED: 'FAILED',
        FAILED: 'FAILED',
      }
      rows.forEach(o => {
        const msgStatut = otpStatutMap[o.statut] ?? 'PENDING'
        // Filtre statut si demandé
        if (statut && msgStatut !== statut) return
        results.push({
          id: o.id,
          source: 'OTP',
          sender: 'OTP',
          destinataire: o.phone,
          contenu: `Code OTP envoyé — ${o.statut === 'VERIFIED' ? 'Vérifié' : o.statut === 'EXPIRED' ? 'Expiré' : o.statut === 'FAILED' ? 'Échoué' : 'En attente'}`,
          statut: msgStatut,
          cost_sms: 1,
          created_at: o.created_at,
        })
      })
    }
  }

  // Trier par date desc et paginer
  results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const total = results.length
  const paginated = results.slice(skip, skip + limit)

  return NextResponse.json({
    items: paginated,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  })
}
