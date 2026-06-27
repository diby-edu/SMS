import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizePhoneNumber } from '@/lib/utils'

/**
 * GET /api/contacts
 * Retourne les contacts de l'utilisateur.
 * Query params :
 *  - list_id : filtre par liste (optionnel)
 *  - page    : pagination (défaut 1)
 *  - search  : recherche par nom/prénom/téléphone
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const listId = searchParams.get('list_id') || undefined
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const search = searchParams.get('search') || ''
  const limit = 50

  const where = {
    user_id: session.user.id,
    ...(listId ? { liste_id: listId } : {}),
    ...(search
      ? {
          OR: [
            { nom: { contains: search, mode: 'insensitive' as const } },
            { prenom: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search } },
          ],
        }
      : {}),
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      select: {
        id: true,
        nom: true,
        prenom: true,
        phone: true,
        pays: true,
        liste_id: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contact.count({ where }),
  ])

  return NextResponse.json({
    contacts,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  })
}

/**
 * POST /api/contacts
 * Ajoute un contact manuellement
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const { nom, prenom, phone: rawPhone, pays, liste_id } = body

  if (!rawPhone?.trim()) {
    return NextResponse.json({ error: 'Numéro de téléphone requis' }, { status: 400 })
  }
  if (!pays) {
    return NextResponse.json({ error: 'Pays requis' }, { status: 400 })
  }

  const phone = normalizePhoneNumber(rawPhone.trim(), pays)
  if (!phone) {
    return NextResponse.json({ error: 'Numéro de téléphone invalide' }, { status: 400 })
  }

  // Vérifie l'unicité dans la liste (ou globale si pas de liste)
  const existing = await prisma.contact.findFirst({
    where: { user_id: session.user.id, phone, ...(liste_id ? { liste_id } : {}) },
  })
  if (existing) {
    return NextResponse.json({ error: 'Ce numéro existe déjà dans cette liste' }, { status: 409 })
  }

  // Si une liste est fournie, vérifier qu'elle appartient à l'utilisateur
  if (liste_id) {
    const list = await prisma.contactList.findFirst({
      where: { id: liste_id, user_id: session.user.id },
    })
    if (!list) return NextResponse.json({ error: 'Liste introuvable' }, { status: 404 })
  }

  const contact = await prisma.contact.create({
    data: {
      user_id: session.user.id,
      nom: nom?.trim() || null,
      prenom: prenom?.trim() || null,
      phone,
      pays,
      liste_id: liste_id || null,
    },
  })

  return NextResponse.json({ contact }, { status: 201 })
}
