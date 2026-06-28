import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createLeTextoSender } from '@/lib/letexto'

const updateSchema = z.object({
  statut: z.enum(['APPROVED', 'REJECTED']),
})

/**
 * PATCH /api/admin/senders/[id]
 * Valider, refuser ou désactiver un sender.
 * Quand APPROVED : appelle aussi l'API LeTexto pour créer le sender si pas encore fait.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const body = await req.json()
  const result = updateSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ errors: result.error.flatten().fieldErrors }, { status: 400 })
  }

  const { statut } = result.data

  // Si l'admin valide manuellement un sender PENDING → appeler LeTexto
  if (statut === 'APPROVED') {
    const existing = await prisma.sender.findUnique({
      where: { id: params.id },
      select: { nom: true, statut: true },
    })

    if (existing && existing.statut === 'PENDING') {
      try {
        await createLeTextoSender(existing.nom)
      } catch (e) {
        console.error('[Admin Sender Approve] Erreur LeTexto:', e)
        // On approuve quand même en local
      }
    }
  }

  const sender = await prisma.sender.update({
    where: { id: params.id },
    data: { statut },
    include: { user: { select: { email: true, nom: true } } },
  })

  return NextResponse.json({ sender })
}
