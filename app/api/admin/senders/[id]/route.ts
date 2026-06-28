import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createLeTextoSender } from '@/lib/letexto'

const updateSchema = z.object({
  statut: z.enum(['SUBMITTED', 'APPROVED', 'REJECTED', 'DISABLED']),
})

/**
 * PATCH /api/admin/senders/[id]
 * Transitions possibles :
 *   PENDING    → SUBMITTED  (admin soumet à LeTexto — appelle l'API)
 *   SUBMITTED  → APPROVED   (opérateurs ont validé)
 *   SUBMITTED  → REJECTED   (opérateurs ont refusé)
 *   PENDING    → REJECTED   (admin refuse directement)
 *   APPROVED   → DISABLED   (admin désactive)
 *   DISABLED   → APPROVED   (admin réactive)
 *   REJECTED   → SUBMITTED  (admin resoumet après correction)
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

  const existing = await prisma.sender.findUnique({
    where: { id: params.id },
    select: { nom: true, statut: true },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Sender introuvable' }, { status: 404 })
  }

  // Quand l'admin soumet à LeTexto : appeler l'API LeTexto pour créer le sender
  if (statut === 'SUBMITTED') {
    try {
      await createLeTextoSender(existing.nom)
    } catch (e) {
      console.error('[Admin Sender Submit] Erreur LeTexto:', e)
      // On change quand même le statut en SUBMITTED même si l'API échoue
    }
  }

  const sender = await prisma.sender.update({
    where: { id: params.id },
    data: { statut },
    include: { user: { select: { email: true, nom: true } } },
  })

  return NextResponse.json({ sender })
}
