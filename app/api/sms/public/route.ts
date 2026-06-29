/**
 * POST /api/sms/public
 * Endpoint public — authentification par clé API (X-API-Key)
 * Envoie un SMS transactionnel ou promotionnel via un sender approuvé
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendSingleSMS, calculateSMSParts } from '@/lib/letexto'

export async function POST(req: NextRequest) {
  try {
    // ---- Récupération de la clé API ----
    const apiKey = req.headers.get('x-api-key')
    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: 'Clé API manquante (header X-API-Key requis)' },
        { status: 401 }
      )
    }

    // ---- Validation de la clé API ----
    const keyRecord = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: { user: { select: { id: true, solde_sms: true, is_active: true } } },
    })

    if (!keyRecord || !keyRecord.is_active) {
      return NextResponse.json(
        { success: false, message: 'Clé API invalide ou désactivée' },
        { status: 401 }
      )
    }

    if (!keyRecord.user.is_active) {
      return NextResponse.json(
        { success: false, message: 'Compte suspendu' },
        { status: 403 }
      )
    }

    if (keyRecord.user.solde_sms < 1) {
      return NextResponse.json(
        { success: false, message: 'Solde SMS insuffisant. Veuillez recharger votre compte TextoPro.' },
        { status: 402 }
      )
    }

    // ---- Validation du body ----
    const body = await req.json()
    const { to, message, sender } = body

    if (!to || typeof to !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Le champ "to" est requis (numéro destinataire)' },
        { status: 400 }
      )
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Le champ "message" est requis' },
        { status: 400 }
      )
    }

    if (!sender || typeof sender !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Le champ "sender" est requis' },
        { status: 400 }
      )
    }

    // Validation format numéro
    const toClean = to.replace(/\s/g, '')
    if (!/^\+?[1-9]\d{7,14}$/.test(toClean)) {
      return NextResponse.json(
        { success: false, message: 'Numéro invalide. Format international requis (ex: +2250700000001)' },
        { status: 400 }
      )
    }

    const messageClean = message.trim()
    if (messageClean.length > 918) {
      return NextResponse.json(
        { success: false, message: 'Message trop long (maximum 918 caractères / 6 SMS)' },
        { status: 400 }
      )
    }

    // ---- Résolution du sender ----
    // Priorité : body sender > default_transactional_sender de la clé
    const senderName = (sender?.trim()) || keyRecord.default_transactional_sender

    if (!senderName) {
      return NextResponse.json(
        {
          success: false,
          message: 'Aucun sender configuré. Précisez le paramètre "sender" ou configurez un sender par défaut sur votre clé API.',
        },
        { status: 400 }
      )
    }

    // ---- Validation du sender — doit être APPROVED + TRANSACTIONAL ou PROMOTIONAL ----
    const senderRecord = await prisma.sender.findFirst({
      where: {
        user_id: keyRecord.user.id,
        nom: senderName,
        statut: 'APPROVED',
        type_message: { in: ['TRANSACTIONAL', 'PROMOTIONAL'] },
      },
    })

    if (!senderRecord) {
      return NextResponse.json(
        {
          success: false,
          message: `Sender "${senderName}" introuvable, non approuvé, ou non de type Transactionnel/Promotionnel`,
        },
        { status: 400 }
      )
    }

    // ---- Calcul du coût SMS ----
    const costSms = calculateSMSParts(messageClean)

    if (keyRecord.user.solde_sms < costSms) {
      return NextResponse.json(
        {
          success: false,
          message: `Solde insuffisant. Ce message coûte ${costSms} SMS (${messageClean.length} caractères).`,
        },
        { status: 402 }
      )
    }

    // ---- Enregistrement en base ----
    const messageRecord = await prisma.message.create({
      data: {
        user_id: keyRecord.user.id,
        api_key_id: keyRecord.id,
        sender: senderRecord.nom,
        destinataire: toClean,
        contenu: messageClean,
        cost_sms: costSms,
      },
    })

    // ---- Envoi via LeTexto ----
    try {
      const result = await sendSingleSMS({
        from: senderRecord.nom,
        to: toClean,
        content: messageClean,
      })

      await prisma.message.update({
        where: { id: messageRecord.id },
        data: { statut: 'SENT', letexto_id: result.id?.toString() ?? null },
      })
    } catch (smsError) {
      await prisma.message.update({
        where: { id: messageRecord.id },
        data: { statut: 'FAILED' },
      })
      console.error('[SMS/public]', smsError)
      return NextResponse.json(
        { success: false, message: "Erreur lors de l'envoi du SMS. Réessayez." },
        { status: 500 }
      )
    }

    // ---- Déduction du solde ----
    await prisma.user.update({
      where: { id: keyRecord.user.id },
      data: { solde_sms: { decrement: costSms } },
    })

    // ---- Mise à jour last_used ----
    await prisma.apiKey.update({
      where: { id: keyRecord.id },
      data: { last_used: new Date() },
    })

    return NextResponse.json({
      success: true,
      message: `SMS envoyé au ${toClean}`,
      message_id: messageRecord.id,
      cost_sms: costSms,
    })
  } catch (error) {
    console.error('[SMS/public]', error)
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
