import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const keys = await prisma.apiKey.findMany({
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      name: true,
      key: true,
      is_active: true,
      last_used: true,
      created_at: true,
      _count: { select: { otpCodes: true } },
      user: { select: { nom: true, prenom: true, email: true } },
    },
  })

  return NextResponse.json({ keys })
}
