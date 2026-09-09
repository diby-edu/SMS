/**
 * POST /api/otp/send
 * Endpoint public — authentification par clé API (X-API-Key)
 * Génère et envoie un code OTP à 6 chiffres via LeTexto
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendSingleSMS } from '@/lib/letexto'
import { rateLimit, getClientIp, tooManyRequests } from '@/lib/rateLimit'

const OTP_EXPIRY_MINUTES = 5
const MAX_ATTEMPTS = 3

// Génère un code numérique à 6 chiffres avec un CSPRNG (le code est un secret d'auth)
function generateOtpCode(): string {
  return crypto.randomInt(100000, 1000000).toString()
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

    // ---- Anti SMS-bombing : max 5 OTP / 10 min par (clé, numéro) + garde par IP ----
    const rl = rateLimit(`otp:${keyRecord.id}:${phoneClean}`, 5, 10 * 60 * 1000)
    if (!rl.allowed) {
      return tooManyRequests(
        rl.retryAfterSec,
        'Trop de demandes de code pour ce numéro. Réessayez dans quelques minutes.'
      )
    }
    const rlIp = rateLimit(`otp-ip:${getClientIp(req)}`, 30, 10 * 60 * 1000)
    if (!rlIp.allowed) {
      return tooManyRequests(rlIp.retryAfterSec)
    }

    // ---- Résolution du sender ----
    // Priorité : body sender > default_otp_sender de la clé API
    let senderName: string | null = null

    if (sender && typeof sender === 'string') {
      // Sender explicite : valider qu'il est APPROVED + OTP
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
    } else if (keyRecord.default_otp_sender) {
      // Utiliser le sender par défaut de la clé API
      senderName = keyRecord.default_otp_sender
    } else {
      // Aucun sender configuré
      return NextResponse.json(
        {
          success: false,
          message: 'Aucun sender OTP configuré. Précisez le paramètre "sender" dans votre requête ou configurez un sender par défaut sur votre clé API.',
        },
        { status: 400 }
      )
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

    // ---- Débit atomique du solde AVANT l'envoi (anti race condition) ----
    const debit = await prisma.user.updateMany({
      where: { id: keyRecord.user.id, is_active: true, solde_sms: { gte: 1 } },
      data: { solde_sms: { decrement: 1 } },
    })
    if (debit.count === 0) {
      await prisma.otpCode.update({ where: { id: otpRecord.id }, data: { statut: 'EXPIRED' } })
      return NextResponse.json(
        { success: false, message: 'Solde SMS insuffisant. Veuillez recharger votre compte TextoPro.' },
        { status: 402 }
      )
    }

    // ---- Envoi du SMS via LeTexto ----
    const smsContent = `Votre code de vérification : ${code}\nValable ${OTP_EXPIRY_MINUTES} minutes. Ne le partagez pas.`

    try {
      await sendSingleSMS({
        from: senderName,
        to: phoneClean,
        content: smsContent,
      })
    } catch (smsError) {
      // Envoi échoué → rembourser (règle métier : ne pas facturer un échec) + annuler le code
      await prisma.$transaction([
        prisma.user.update({
          where: { id: keyRecord.user.id },
          data: { solde_sms: { increment: 1 } },
        }),
        prisma.otpCode.update({ where: { id: otpRecord.id }, data: { statut: 'EXPIRED' } }),
      ])
      console.error('[OTP] Erreur envoi SMS:', smsError)
      return NextResponse.json(
        { success: false, message: "Erreur lors de l'envoi du SMS. Réessayez." },
        { status: 500 }
      )
    }

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
