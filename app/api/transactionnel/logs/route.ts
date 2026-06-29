import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  const [logs, total] = await Promise.all([
    prisma.message.findMany({
      where: { user_id: session.user.id, api_key_id: { not: null } },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        sender: true,
        destinataire: true,
        contenu: true,
        statut: true,
        cost_sms: true,
        created_at: true,
        apiKey: { select: { name: true } },
      },
    }),
    prisma.message.count({
      where: { user_id: session.user.id, api_key_id: { not: null } },
    }),
  ])

  return NextResponse.json({ logs, total })
}
