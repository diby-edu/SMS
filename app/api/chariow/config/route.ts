import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

/**
 * GET /api/chariow/config
 * Retourne les configurations Chariow de l'utilisateur connecté
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const configs = await prisma.chariowConfig.findMany({
    where: { user_id: session.user.id },
    orderBy: { created_at: 'desc' },
  })

  return NextResponse.json({ configs })
}

/**
 * POST /api/chariow/config
 * Crée une nouvelle configuration Chariow
 * Body: { sender: string }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const { sender } = body

  if (!sender || typeof sender !== 'string') {
    return NextResponse.json({ error: 'Le sender est requis' }, { status: 400 })
  }

  // Vérifier que le sender est APPROVED + TRANSACTIONAL ou PROMOTIONAL
  const senderRecord = await prisma.sender.findFirst({
    where: {
      user_id: session.user.id,
      nom: sender,
      statut: 'APPROVED',
      type_message: { in: ['TRANSACTIONAL', 'PROMOTIONAL'] },
    },
  })

  if (!senderRecord) {
    return NextResponse.json(
      { error: `Sender "${sender}" introuvable ou non approuvé` },
      { status: 400 }
    )
  }

  // Générer un token unique sécurisé
  const token = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '')

  const config = await prisma.chariowConfig.create({
    data: {
      user_id: session.user.id,
      sender,
      token,
      events_disabled: [],
    },
  })

  return NextResponse.json({ config }, { status: 201 })
}
