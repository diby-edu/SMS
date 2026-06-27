import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createSMSCampaign } from '@/lib/letexto'

// ============================================================
// VALIDATION
// ============================================================

const contactSchema = z.object({
  phone: z.string().min(8),
  nom: z.string().optional(),
  prenom: z.string().optional(),
}).and(z.record(z.string()).optional() as z.ZodType<Record<string, string>>)

const campaignSchema = z.object({
  label: z.string().min(1, 'Nom de campagne requis').max(100).trim(),
  sender: z.string().min(2, 'Sender requis').max(11).trim(),
  content: z.string().min(1, 'Message vide').max(918).trim(),
  contacts: z
    .array(z.object({ phone: z.string().min(8) }).catchall(z.string()))
    .min(1, 'Ajoutez au moins un contact'),
})

// ============================================================
// POST /api/campaigns
// ============================================================

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const result = campaignSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { errors: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { label, sender, content, contacts } = result.data
    const userId = session.user.id
    const nbContacts = contacts.length

    // Vérification du solde
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { solde_sms: true, is_active: true },
    })

    if (!user?.is_active) {
      return NextResponse.json({ error: 'Compte désactivé' }, { status: 403 })
    }

    if ((user?.solde_sms ?? 0) < nbContacts) {
      return NextResponse.json(
        {
          error: `Solde insuffisant. La campagne nécessite ${nbContacts} SMS, vous en avez ${user?.solde_sms}.`,
          required: nbContacts,
          solde_actuel: user?.solde_sms,
        },
        { status: 402 }
      )
    }

    // Débit atomique + création de la campagne en DB
    const [, campaign] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { solde_sms: { decrement: nbContacts } },
      }),
      prisma.campaign.create({
        data: {
          user_id: userId,
          label,
          sender_nom: sender,
          contenu: content,
          nb_contacts: nbContacts,
          cost_sms: nbContacts,
          statut: 'CREATED',
        },
      }),
    ])

    // Appel API LeTexto
    let letextoResponse
    try {
      letextoResponse = await createSMSCampaign({
        label,
        sender,
        contacts: contacts as Array<{ phone: string } & Record<string, string>>,
        content,
      })

      await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          letexto_id: String(letextoResponse.id),
          statut: 'SENT',
        },
      })
    } catch (letextoError) {
      console.error('[Campaign] Erreur LeTexto:', letextoError)
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { statut: 'FAILED' },
      })

      return NextResponse.json(
        {
          error: 'La campagne a été débitée mais l\'envoi a échoué. Contactez le support.',
          campaign_id: campaign.id,
        },
        { status: 502 }
      )
    }

    // Solde restant
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { solde_sms: true },
    })

    return NextResponse.json({
      success: true,
      campaign_id: campaign.id,
      letexto_id: letextoResponse.id,
      nb_contacts: nbContacts,
      solde_restant: updatedUser?.solde_sms ?? 0,
    })
  } catch (error) {
    console.error('[Campaign] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// ============================================================
// GET /api/campaigns — Liste des campagnes de l'utilisateur
// ============================================================

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 10
  const skip = (page - 1) * limit

  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where: { user_id: session.user.id },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
    prisma.campaign.count({ where: { user_id: session.user.id } }),
  ])

  return NextResponse.json({ campaigns, total, page, totalPages: Math.ceil(total / limit) })
}
