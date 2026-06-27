import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const search = searchParams.get('search') || ''
  const limit = 20
  const skip = (page - 1) * limit

  const where = {
    role: 'CLIENT' as const,
    ...(search && {
      OR: [
        { email: { contains: search, mode: 'insensitive' as const } },
        { nom: { contains: search, mode: 'insensitive' as const } },
        { prenom: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search } },
      ],
    }),
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, nom: true, prenom: true, email: true,
        phone: true, pays: true, solde_sms: true,
        is_active: true, created_at: true,
        _count: { select: { messages: true, campaigns: true, transactions: true } },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({ users, total, page, totalPages: Math.ceil(total / limit) })
}
