import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * DELETE /api/contacts/lists/[id]
 * Supprime une liste et dissocie ses contacts (contacts conservés sans liste)
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const list = await prisma.contactList.findFirst({
    where: { id: params.id, user_id: session.user.id },
  })

  if (!list) return NextResponse.json({ error: 'Liste introuvable' }, { status: 404 })

  await prisma.contactList.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}
