import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * DELETE /api/contacts/[id]
 * Supprime un contact
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const contact = await prisma.contact.findFirst({
    where: { id: params.id, user_id: session.user.id },
  })

  if (!contact) return NextResponse.json({ error: 'Contact introuvable' }, { status: 404 })

  await prisma.contact.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}
