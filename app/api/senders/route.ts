import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/senders
 * - Sans paramètre : tous les senders de l'utilisateur (page Senders)
 * - ?approved=true : senders approuvés uniquement (pour les selects d'envoi)
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const approvedOnly = searchParams.get('approved') === 'true'

  const senders = await prisma.sender.findMany({
    where: {
      user_id: session.user.id,
      ...(approvedOnly && { statut: 'APPROVED' }),
    },
    select: { id: true, nom: true, statut: true, type_message: true, created_at: true },
    orderBy: { created_at: 'desc' },
  })

  return NextResponse.json({ senders })
}
