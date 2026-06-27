/**
 * GET  /api/otp/keys — Liste les clés API du client connecté
 * POST /api/otp/keys — Crée une nouvelle clé API
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

function generateApiKey(): string {
  const random = crypto.randomBytes(24).toString('hex')
  return `tp_live_${random}`
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const keys = await prisma.apiKey.findMany({
    where: { user_id: session.user.id },
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      name: true,
      key: true,
      is_active: true,
      last_used: true,
      created_at: true,
      _count: { select: { otpCodes: true } },
    },
  })

  return NextResponse.json({ keys })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await req.json()
  const { name } = body

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return NextResponse.json(
      { error: 'Le nom de l\'application est requis (minimum 2 caractères)' },
      { status: 400 }
    )
  }

  // Limite : 5 clés API par client
  const count = await prisma.apiKey.count({
    where: { user_id: session.user.id, is_active: true },
  })

  if (count >= 5) {
    return NextResponse.json(
      { error: 'Limite atteinte (5 clés API maximum). Supprimez une clé existante pour en créer une nouvelle.' },
      { status: 400 }
    )
  }

  const newKey = await prisma.apiKey.create({
    data: {
      user_id: session.user.id,
      name: name.trim(),
      key: generateApiKey(),
    },
  })

  return NextResponse.json({ key: newKey }, { status: 201 })
}
