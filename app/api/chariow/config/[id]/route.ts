import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * PATCH /api/chariow/config/[id]
 * Met à jour les événements désactivés
 * Body: { events_disabled: string[] }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const config = await prisma.chariowConfig.findFirst({
    where: { id: params.id, user_id: session.user.id },
  })

  if (!config) return NextResponse.json({ error: 'Configuration introuvable' }, { status: 404 })

  const body = await req.json()
  const { events_disabled } = body

  const updated = await prisma.chariowConfig.update({
    where: { id: params.id },
    data: {
      events_disabled: Array.isArray(events_disabled) ? events_disabled : config.events_disabled,
    },
  })

  return NextResponse.json({ config: updated })
}

/**
 * DELETE /api/chariow/config/[id]
 * Supprime une configuration Chariow
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const config = await prisma.chariowConfig.findFirst({
    where: { id: params.id, user_id: session.user.id },
  })

  if (!config) return NextResponse.json({ error: 'Configuration introuvable' }, { status: 404 })

  await prisma.chariowConfig.delete({ where: { id: params.id } })

  return NextResponse.json({ ok: true })
}
