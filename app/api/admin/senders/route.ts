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
  const statutFilter = searchParams.get('statut') || 'PENDING'

  const senders = await prisma.sender.findMany({
    where: { statut: statutFilter as 'PENDING' | 'APPROVED' | 'REJECTED' },
    include: {
      user: { select: { id: true, nom: true, prenom: true, email: true, pays: true } },
    },
    orderBy: { created_at: 'asc' },
  })

  return NextResponse.json({ senders })
}
