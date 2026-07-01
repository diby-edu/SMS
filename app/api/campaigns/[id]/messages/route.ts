import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // Vérifier que la campagne appartient bien à l'utilisateur
  const campaign = await prisma.campaign.findFirst({
    where: { id: params.id, user_id: session.user.id },
    select: { id: true },
  })

  if (!campaign) {
    return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 })
  }

  const messages = await prisma.message.findMany({
    where: { campaign_id: params.id },
    select: { destinataire: true, statut: true },
    orderBy: { created_at: 'asc' },
  })

  return NextResponse.json({ messages })
}
