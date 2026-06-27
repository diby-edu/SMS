import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizePhoneNumber, COUNTRY_PHONE_PREFIXES } from '@/lib/utils'

/**
 * POST /api/contacts/import
 * Importe des contacts en masse depuis un tableau JSON
 * Body : { contacts: [{phone, nom?, prenom?, pays?}], liste_id?, defaultPays? }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const { contacts: rawContacts, liste_id, defaultPays = 'CI' } = body

  if (!Array.isArray(rawContacts) || rawContacts.length === 0) {
    return NextResponse.json({ error: 'Aucun contact fourni' }, { status: 400 })
  }

  if (rawContacts.length > 10000) {
    return NextResponse.json({ error: 'Maximum 10 000 contacts par import' }, { status: 400 })
  }

  // Vérifier la liste si fournie
  if (liste_id) {
    const list = await prisma.contactList.findFirst({
      where: { id: liste_id, user_id: session.user.id },
    })
    if (!list) return NextResponse.json({ error: 'Liste introuvable' }, { status: 404 })
  }

  // Récupérer les numéros déjà existants (pour éviter les doublons)
  const existingPhones = new Set(
    (
      await prisma.contact.findMany({
        where: { user_id: session.user.id },
        select: { phone: true },
      })
    ).map((c) => c.phone)
  )

  const toInsert: Array<{
    user_id: string
    nom: string | null
    prenom: string | null
    phone: string
    pays: string
    liste_id: string | null
  }> = []

  let skipped = 0

  for (const raw of rawContacts) {
    const rawPhone = raw.phone || raw.telephone || raw.numero
    if (!rawPhone) { skipped++; continue }

    const pays = raw.pays && COUNTRY_PHONE_PREFIXES[raw.pays] ? raw.pays : defaultPays
    const phone = normalizePhoneNumber(String(rawPhone).trim(), pays)
    if (!phone) { skipped++; continue }

    if (existingPhones.has(phone)) { skipped++; continue }

    existingPhones.add(phone) // Évite les doublons dans le batch lui-même
    toInsert.push({
      user_id: session.user.id,
      nom: raw.nom ? String(raw.nom).trim() : null,
      prenom: raw.prenom ? String(raw.prenom).trim() : null,
      phone,
      pays,
      liste_id: liste_id || null,
    })
  }

  if (toInsert.length === 0) {
    return NextResponse.json({
      imported: 0,
      skipped,
      message: 'Aucun nouveau contact valide à importer',
    })
  }

  await prisma.contact.createMany({ data: toInsert })

  return NextResponse.json({
    imported: toInsert.length,
    skipped,
    message: `${toInsert.length} contact(s) importé(s)`,
  })
}
