import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * DELETE /api/senders/[id]
 * Supprime un sender appartenant à l'utilisateur connecté
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const sender = await prisma.sender.findFirst({
    where: { id: params.id, user_id: session.user.id },
  })

  if (!sender) {
    return NextResponse.json({ error: 'Sender introuvable' }, { status: 404 })
  }

  await prisma.sender.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}
