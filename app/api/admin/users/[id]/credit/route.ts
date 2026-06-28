import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const creditSchema = z.object({
  sms_credites: z.number().int().min(1, 'Minimum 1 SMS').max(100000, 'Maximum 100 000 SMS'),
  note: z.string().max(200).optional(),
})

/**
 * POST /api/admin/users/[id]/credit
 * Crédite manuellement un utilisateur en SMS
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const body = await req.json()
  const result = creditSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ errors: result.error.flatten().fieldErrors }, { status: 400 })
  }

  const { sms_credites, note } = result.data

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, nom: true, prenom: true, email: true, solde_sms: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
  }

  // Crédit atomique : transaction + solde en une seule opération
  const [transaction, updatedUser] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        user_id: params.id,
        montant_fcfa: 0,
        sms_credites,
        statut: 'SUCCESS',
        type: 'MANUELLE',
        note: note || null,
      },
    }),
    prisma.user.update({
      where: { id: params.id },
      data: { solde_sms: { increment: sms_credites } },
      select: { solde_sms: true },
    }),
  ])

  return NextResponse.json({
    success: true,
    transaction,
    nouveau_solde: updatedUser.solde_sms,
  })
}
