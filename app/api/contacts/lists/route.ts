import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/contacts/lists
 * Retourne toutes les listes de contacts de l'utilisateur avec le nombre de contacts
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const lists = await prisma.contactList.findMany({
    where: { user_id: session.user.id },
    include: { _count: { select: { contacts: true } } },
    orderBy: { created_at: 'desc' },
  })

  return NextResponse.json({ lists })
}

/**
 * POST /api/contacts/lists
 * Crée une nouvelle liste de contacts
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const nom = body.nom?.trim()

  if (!nom || nom.length < 2) {
    return NextResponse.json({ error: 'Nom de liste invalide (min 2 caractères)' }, { status: 400 })
  }
  if (nom.length > 50) {
    return NextResponse.json({ error: 'Nom trop long (max 50 caractères)' }, { status: 400 })
  }

  const list = await prisma.contactList.create({
    data: { user_id: session.user.id, nom },
    include: { _count: { select: { contacts: true } } },
  })

  return NextResponse.json({ list }, { status: 201 })
}
