import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const createSenderSchema = z.object({
  nom: z
    .string()
    .min(2, 'Minimum 2 caractères')
    .max(11, 'Maximum 11 caractères')
    .regex(/^[a-zA-Z0-9\s\-]+$/, 'Lettres, chiffres, espaces et tirets uniquement')
    .trim(),
})

/**
 * POST /api/senders/create
 * Crée une demande de sender — statut PENDING jusqu'à validation admin
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const result = createSenderSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { errors: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { nom } = result.data

    // Vérifier l'unicité du sender pour cet utilisateur
    const existing = await prisma.sender.findFirst({
      where: { user_id: session.user.id, nom },
    })

    if (existing) {
      return NextResponse.json(
        { errors: { nom: ['Vous avez déjà un sender avec ce nom'] } },
        { status: 409 }
      )
    }

    const sender = await prisma.sender.create({
      data: {
        user_id: session.user.id,
        nom,
        statut: 'PENDING',
      },
    })

    return NextResponse.json({ sender }, { status: 201 })
  } catch (error) {
    console.error('[Sender Create]', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
