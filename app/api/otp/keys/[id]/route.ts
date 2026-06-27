/**
 * DELETE /api/otp/keys/[id] — Supprime (désactive) une clé API
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const keyRecord = await prisma.apiKey.findFirst({
    where: { id: params.id, user_id: session.user.id },
  })

  if (!keyRecord) {
    return NextResponse.json({ error: 'Clé introuvable' }, { status: 404 })
  }

  await prisma.apiKey.update({
    where: { id: params.id },
    data: { is_active: false },
  })

  return NextResponse.json({ success: true })
}
