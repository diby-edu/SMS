import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendSingleSMS, calculateSMSParts } from '@/lib/letexto'
import { rateLimit, tooManyRequests } from '@/lib/rateLimit'

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

    // Rate limiting par utilisateur (anti-abus)
    const rl = rateLimit(`sms-send:${userId}`, 30, 60 * 1000)
    if (!rl.allowed) return tooManyRequests(rl.retryAfterSec)

    // Vérifier que le sender appartient à l'utilisateur, est approuvé, et n'est PAS de type OTP
    const approvedSender = await prisma.sender.findFirst({
      where: { user_id: userId, nom: from, statut: 'APPROVED', type_message: { not: 'OTP' } },
    })
    if (!approvedSender) {
      return NextResponse.json(
        { error: 'Expéditeur invalide, non approuvé, ou de type OTP (réservé aux codes OTP)' },
        { status: 403 }
      )
    }

    // Calcul du nombre de SMS (parts)
    const partCount = calculateSMSParts(content)

    // Débit atomique anti-race : ne passe que si compte actif ET solde suffisant
    const debit = await prisma.user.updateMany({
      where: { id: userId, is_active: true, solde_sms: { gte: partCount } },
      data: { solde_sms: { decrement: partCount } },
    })
    if (debit.count === 0) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { solde_sms: true, is_active: true },
      })
      if (!user?.is_active) {
        return NextResponse.json({ error: 'Compte désactivé' }, { status: 403 })
      }
      return NextResponse.json(
        {
          error: `Solde insuffisant. Ce message nécessite ${partCount} SMS, vous en avez ${user?.solde_sms ?? 0}.`,
          solde_actuel: user?.solde_sms ?? 0,
          required: partCount,
        },
        { status: 402 }
      )
    }

    // Créer l'enregistrement du message en PENDING
    const message = await prisma.message.create({
      data: {
        user_id: userId,
        sender: from,
        destinataire: to,
        contenu: content,
        statut: 'PENDING',
        cost_sms: partCount,
      },
    })

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
      // Envoi échoué → remboursement (ne pas facturer un échec) + marquer FAILED
      console.error('[SMS Send] Erreur LeTexto:', letextoError)
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { solde_sms: { increment: partCount } },
        }),
        prisma.message.update({
          where: { id: message.id },
          data: { statut: 'FAILED' },
        }),
      ])

      return NextResponse.json(
        {
          error: "L'envoi a échoué côté opérateur. Vous n'avez pas été débité. Réessayez.",
          message_id: message.id,
        },
        { status: 502 }
      )
    }

    const fresh = await prisma.user.findUnique({
      where: { id: userId },
      select: { solde_sms: true },
    })

    return NextResponse.json({
      success: true,
      message_id: message.id,
      letexto_id: letextoResponse.id,
      parts: letextoResponse.partCount,
      solde_restant: fresh?.solde_sms ?? 0,
    })
  } catch (error) {
    console.error('[SMS Send] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
