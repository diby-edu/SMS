/**
 * DELETE /api/otp/keys/[id] — Supprime (désactive) une clé API
 * PATCH  /api/otp/keys/[id] — Met à jour le sender OTP par défaut
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
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

  const body = await req.json()
  const { default_otp_sender } = body

  // Si un sender est spécifié, vérifier qu'il est APPROVED + OTP
  if (default_otp_sender) {
    const senderRecord = await prisma.sender.findFirst({
      where: {
        user_id: session.user.id,
        nom: default_otp_sender,
        statut: 'APPROVED',
        type_message: 'OTP',
      },
    })
    if (!senderRecord) {
      return NextResponse.json(
        { error: 'Sender OTP introuvable ou non approuvé' },
        { status: 400 }
      )
    }
  }

  const updated = await prisma.apiKey.update({
    where: { id: params.id },
    data: { default_otp_sender: default_otp_sender || null },
  })

  return NextResponse.json({ success: true, default_otp_sender: updated.default_otp_sender })
}

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
