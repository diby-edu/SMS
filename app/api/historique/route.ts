import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

/**
 * GET /api/historique
 * Retourne la liste paginée et filtrée des messages + campagnes de l'utilisateur
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
  const type = searchParams.get('type') || 'all' // 'all' | 'message' | 'campaign'
  const statut = searchParams.get('statut') || '' // 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED'
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

  // ---- Requêtes messages ----
  const messageWhere: Prisma.MessageWhereInput = {
    user_id: userId,
    ...(statut && { statut: statut as 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' }),
    ...(Object.keys(dateFilter).length > 0 && { created_at: dateFilter }),
  }

  // ---- Requêtes campagnes ----
  const campaignWhere: Prisma.CampaignWhereInput = {
    user_id: userId,
    ...(Object.keys(dateFilter).length > 0 && { created_at: dateFilter }),
  }

  let messages: {
    id: string; type: 'MESSAGE'; sender: string; destinataire: string
    contenu: string; statut: string; cost_sms: number; created_at: Date
  }[] = []
  let campaigns: {
    id: string; type: 'CAMPAIGN'; sender: string; destinataire: string
    contenu: string; statut: string; cost_sms: number; created_at: Date
  }[] = []

  if (type !== 'campaign') {
    const raw = await prisma.message.findMany({
      where: messageWhere,
      select: {
        id: true, sender: true, destinataire: true,
        contenu: true, statut: true, cost_sms: true, created_at: true,
      },
    })
    messages = raw.map((m) => ({ ...m, type: 'MESSAGE' as const }))
  }

  if (type !== 'message') {
    const raw = await prisma.campaign.findMany({
      where: campaignWhere,
      select: {
        id: true, sender_nom: true, nb_contacts: true,
        contenu: true, statut: true, cost_sms: true, created_at: true, label: true,
      },
    })
    campaigns = raw.map((c) => ({
      id: c.id,
      type: 'CAMPAIGN' as const,
      sender: c.sender_nom,
      destinataire: `${c.label} — ${c.nb_contacts} contacts`,
      contenu: c.contenu,
      statut: c.statut,
      cost_sms: c.cost_sms,
      created_at: c.created_at,
    }))
  }

  // Fusionner et trier par date desc
  const all = [...messages, ...campaigns].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const total = all.length
  const paginated = all.slice(skip, skip + limit)

  return NextResponse.json({
    items: paginated,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  })
}
