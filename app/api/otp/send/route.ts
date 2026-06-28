/**
 * POST /api/otp/send
 * Endpoint public — authentification par clé API (X-API-Key)
 * Génère et envoie un code OTP à 6 chiffres via LeTexto
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendSingleSMS } from '@/lib/letexto'

const OTP_EXPIRY_MINUTES = 5
const MAX_ATTEMPTS = 3
const OTP_SENDER_FALLBACK = 'TextoPro'

// Génère un code numérique à 6 chiffres
function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

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

    // ---- Vérification du solde ----
    if (keyRecord.user.solde_sms < 1) {
      return NextResponse.json(
        { success: false, message: 'Solde SMS insuffisant. Veuillez recharger votre compte TextoPro.' },
        { status: 402 }
      )
    }

    // ---- Validation du body ----
    const body = await req.json()
    const { phone, sender } = body

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Le champ "phone" est requis' },
        { status: 400 }
      )
    }

    // Validation format international basique
    const phoneClean = phone.replace(/\s/g, '')
    if (!/^\+?[1-9]\d{7,14}$/.test(phoneClean)) {
      return NextResponse.json(
        { success: false, message: 'Numéro de téléphone invalide. Format international requis (ex: +2250700000001)' },
        { status: 400 }
      )
    }

    // ---- Résolution du sender ----
    let senderName = OTP_SENDER_FALLBACK
    if (sender && typeof sender === 'string') {
      // Vérifier que le sender appartient au client, est APPROVED et de type OTP
      const senderRecord = await prisma.sender.findFirst({
        where: {
          user_id: keyRecord.user.id,
          nom: sender.trim(),
          statut: 'APPROVED',
          type_message: 'OTP',
        },
      })
      if (!senderRecord) {
        return NextResponse.json(
          { success: false, message: `Sender "${sender}" introuvable, non approuvé ou non de type OTP` },
          { status: 400 }
        )
      }
      senderName = senderRecord.nom
    }

    // ---- Invalider les codes OTP précédents non expirés pour ce numéro ----
    await prisma.otpCode.updateMany({
      where: {
        api_key_id: keyRecord.id,
        phone: phoneClean,
        statut: 'PENDING',
      },
      data: { statut: 'EXPIRED' },
    })

    // ---- Génération du code ----
    const code = generateOtpCode()
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

    // ---- Enregistrement en base ----
    const otpRecord = await prisma.otpCode.create({
      data: {
        api_key_id: keyRecord.id,
        phone: phoneClean,
        code,
        expires_at: expiresAt,
      },
    })

    // ---- Envoi du SMS via LeTexto ----
    const smsContent = `Votre code de vérification : ${code}\nValable ${OTP_EXPIRY_MINUTES} minutes. Ne le partagez pas.`

    try {
      await sendSingleSMS({
        from: senderName,
        to: phoneClean,
        content: smsContent,
      })
    } catch (smsError) {
      // Annuler le code OTP si l'envoi échoue
      await prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { statut: 'EXPIRED' },
      })
      console.error('[OTP] Erreur envoi SMS:', smsError)
      return NextResponse.json(
        { success: false, message: "Erreur lors de l'envoi du SMS. Réessayez." },
        { status: 500 }
      )
    }

    // ---- Déduction du solde (1 SMS) ----
    await prisma.user.update({
      where: { id: keyRecord.user.id },
      data: { solde_sms: { decrement: 1 } },
    })

    // ---- Mise à jour de last_used sur la clé API ----
    await prisma.apiKey.update({
      where: { id: keyRecord.id },
      data: { last_used: new Date() },
    })

    return NextResponse.json({
      success: true,
      message: `Code OTP envoyé au ${phoneClean}`,
      expires_in: OTP_EXPIRY_MINUTES * 60, // en secondes
    })
  } catch (error) {
    console.error('[OTP/send]', error)
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
