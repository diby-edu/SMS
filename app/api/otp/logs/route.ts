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

  // Récupérer les clés API de l'utilisateur
  const userKeys = await prisma.apiKey.findMany({
    where: { user_id: session.user.id },
    select: { id: true, name: true },
  })
  const keyIds = userKeys.map((k) => k.id)
  const keyMap = Object.fromEntries(userKeys.map((k) => [k.id, k.name]))

  const [logs, total] = await Promise.all([
    prisma.otpCode.findMany({
      where: { api_key_id: { in: keyIds } },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        phone: true,
        statut: true,
        attempts: true,
        expires_at: true,
        verified_at: true,
        created_at: true,
        api_key_id: true,
        apiKey: { select: { name: true } },
      },
    }),
    prisma.otpCode.count({ where: { api_key_id: { in: keyIds } } }),
  ])

  return NextResponse.json({ logs: logs.map((l) => ({ ...l, key_name: keyMap[l.api_key_id] ?? l.apiKey?.name ?? '—' })), total })
}
