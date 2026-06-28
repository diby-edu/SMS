import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createLeTextoSender } from '@/lib/letexto'

const createSenderSchema = z.object({
  nom: z
    .string()
    .min(2, 'Minimum 2 caractères')
    .max(11, 'Maximum 11 caractères')
    .regex(/^[a-zA-Z0-9\s\-]+$/, 'Lettres, chiffres, espaces et tirets uniquement')
    .trim(),
  type_message: z.enum(['PROMOTIONAL', 'OTP', 'TRANSACTIONAL'], {
    errorMap: () => ({ message: 'Type de message requis' }),
  }),
  description: z.string().min(10, 'Description trop courte (min 10 caractères)').max(500),
  email_contact: z.string().email('Email invalide'),
  site_web: z.string().optional().default(''),
  adresse: z.string().min(5, 'Adresse requise').max(255),
  siege_social: z.string().min(2, 'Siège social requis').max(255),
  exemple_message: z.string().min(10, 'Exemple de message requis (min 10 caractères)').max(1000),
  activite: z.string().min(2, 'Secteur d\'activité requis').max(100),
})

/**
 * POST /api/senders/create
 * Crée un sender + appelle l'API LeTexto automatiquement
 * Statut APPROVED si LeTexto accepte, PENDING sinon
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const result = createSenderSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { errors: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { nom, type_message, description, email_contact, site_web, adresse, siege_social, exemple_message, activite } = result.data

    // Vérifier l'unicité du sender pour cet utilisateur
    const existing = await prisma.sender.findFirst({
      where: { user_id: session.user.id, nom },
    })

    if (existing) {
      return NextResponse.json(
        { errors: { nom: ['Vous avez déjà un sender avec ce nom'] } },
        { status: 409 }
      )
    }

    // Appel API LeTexto pour créer le sender
    let statut: 'APPROVED' | 'PENDING' = 'PENDING'
    try {
      await createLeTextoSender(nom)
      statut = 'APPROVED'
    } catch (letextoError) {
      console.error('[Sender Create] Erreur LeTexto:', letextoError)
      // On crée quand même en PENDING — l'admin validera manuellement
      statut = 'PENDING'
    }

    const sender = await prisma.sender.create({
      data: {
        user_id: session.user.id,
        nom,
        statut,
        type_message,
        description,
        email_contact,
        site_web,
        adresse,
        siege_social,
        exemple_message,
        activite,
      },
    })

    return NextResponse.json({ sender }, { status: 201 })
  } catch (error) {
    console.error('[Sender Create]', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
