import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const updateSchema = z.object({
  statut: z.enum(['APPROVED', 'REJECTED']),
})

/**
 * PATCH /api/admin/senders/[id]
 * Valider ou refuser un sender
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

  const sender = await prisma.sender.update({
    where: { id: params.id },
    data: { statut: result.data.statut },
    include: { user: { select: { email: true, nom: true } } },
  })

  return NextResponse.json({ sender })
}
