/**
 * GET /api/transactionnel/stats
 * Stats des SMS transactionnels envoyés via API (api_key_id non null)
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const userId = session.user.id
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const baseWhere = { user_id: userId, api_key_id: { not: null } }

  const [total, thisMonth, delivered, failed] = await Promise.all([
    prisma.message.count({ where: baseWhere }),
    prisma.message.count({ where: { ...baseWhere, created_at: { gte: startOfMonth } } }),
    prisma.message.count({ where: { ...baseWhere, statut: 'DELIVERED' } }),
    prisma.message.count({ where: { ...baseWhere, statut: 'FAILED' } }),
  ])

  const nonPending = await prisma.message.count({
    where: { ...baseWhere, statut: { not: 'PENDING' } },
  })

  const tauxLivraison = nonPending > 0 ? Math.round((delivered / nonPending) * 100) : 0

  return NextResponse.json({ total, thisMonth, delivered, failed, tauxLivraison })
}
