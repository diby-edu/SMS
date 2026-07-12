import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendSingleSMS, calculateSMSParts } from '@/lib/letexto'

// ============================================================
// VALIDATION
// ============================================================

const sendSchema = z.object({
  from: z
    .string()
    .min(2, 'Sender trop court')
    .max(11, 'Sender max 11 caractères')
    .trim(),
  to: z
    .string()
    .min(8, 'Numéro invalide')
    .trim(),
  content: z
    .string()
    .min(1, 'Le message est vide')
    .max(918, 'Message trop long (max 918 caractères)')
    .trim(),
})

// ============================================================
// POST /api/sms/send
// ============================================================

export async function POST(req: NextRequest) {
  // Auth
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const result = sendSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { errors: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { from, to, content } = result.data
    const userId = session.user.id

    // Vérifier que le sender appartient à l'utilisateur et est approuvé
    const approvedSender = await prisma.sender.findFirst({
      where: { user_id: userId, nom: from, statut: 'APPROVED' },
    })
    if (!approvedSender) {
      return NextResponse.json(
        { error: 'Expéditeur invalide ou non approuvé' },
        { status: 403 }
      )
    }

    // Calcul du nombre de SMS (parts)
    const partCount = calculateSMSParts(content)

    // Vérification du solde en base (source de vérité)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { solde_sms: true, is_active: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    if (!user.is_active) {
      return NextResponse.json({ error: 'Compte désactivé' }, { status: 403 })
    }

    if (user.solde_sms < partCount) {
      return NextResponse.json(
        {
          error: `Solde insuffisant. Ce message nécessite ${partCount} SMS, vous en avez ${user.solde_sms}.`,
          solde_actuel: user.solde_sms,
          required: partCount,
        },
        { status: 402 }
      )
    }

    // Débit du solde AVANT l'envoi (transaction atomique)
    // Si LeTexto échoue, on ne rembourse pas (décision métier confirmée)
    const [updatedUser, message] = await prisma.$transaction([
      // Déduire le solde
      prisma.user.update({
        where: { id: userId },
        data: { solde_sms: { decrement: partCount } },
        select: { solde_sms: true },
      }),
      // Créer l'enregistrement du message en PENDING
      prisma.message.create({
        data: {
          user_id: userId,
          sender: from,
          destinataire: to,
          contenu: content,
          statut: 'PENDING',
          cost_sms: partCount,
        },
      }),
    ])

    // Appel API LeTexto (côté serveur uniquement)
    let letextoResponse
    try {
      letextoResponse = await sendSingleSMS({
        from,
        to,
        content,
        customData: message.id,
      })

      // Mettre à jour le message avec l'ID LeTexto
      await prisma.message.update({
        where: { id: message.id },
        data: {
          letexto_id: letextoResponse.id,
          statut: 'SENT',
        },
      })
    } catch (letextoError) {
      // LeTexto a échoué — on log mais on ne rembourse pas
      console.error('[SMS Send] Erreur LeTexto:', letextoError)
      await prisma.message.update({
        where: { id: message.id },
        data: { statut: 'FAILED' },
      })

      return NextResponse.json(
        {
          error: 'Le SMS a été débité mais l\'envoi a échoué côté opérateur. Contactez le support.',
          message_id: message.id,
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      message_id: message.id,
      letexto_id: letextoResponse.id,
      parts: letextoResponse.partCount,
      solde_restant: updatedUser.solde_sms,
    })
  } catch (error) {
    console.error('[SMS Send] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
