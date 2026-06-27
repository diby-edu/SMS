/**
 * POST /api/otp/verify
 * Endpoint public — authentification par clé API (X-API-Key)
 * Vérifie le code OTP saisi par l'utilisateur final
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const MAX_ATTEMPTS = 3

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
      select: { id: true, is_active: true },
    })

    if (!keyRecord || !keyRecord.is_active) {
      return NextResponse.json(
        { success: false, message: 'Clé API invalide ou désactivée' },
        { status: 401 }
      )
    }

    // ---- Validation du body ----
    const body = await req.json()
    const { phone, code } = body

    if (!phone || !code) {
      return NextResponse.json(
        { success: false, message: 'Les champs "phone" et "code" sont requis' },
        { status: 400 }
      )
    }

    const phoneClean = String(phone).replace(/\s/g, '')
    const codeClean = String(code).trim()

    // ---- Recherche du code OTP actif ----
    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        api_key_id: keyRecord.id,
        phone: phoneClean,
        statut: 'PENDING',
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
    })

    if (!otpRecord) {
      return NextResponse.json(
        { success: false, verified: false, message: 'Code OTP introuvable ou expiré. Demandez un nouveau code.' },
        { status: 400 }
      )
    }

    // ---- Vérification du nombre de tentatives ----
    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      await prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { statut: 'FAILED' },
      })
      return NextResponse.json(
        { success: false, verified: false, message: 'Trop de tentatives. Demandez un nouveau code.' },
        { status: 429 }
      )
    }

    // ---- Vérification du code ----
    if (otpRecord.code !== codeClean) {
      const newAttempts = otpRecord.attempts + 1
      const remaining = MAX_ATTEMPTS - newAttempts

      await prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: {
          attempts: newAttempts,
          ...(newAttempts >= MAX_ATTEMPTS ? { statut: 'FAILED' } : {}),
        },
      })

      return NextResponse.json(
        {
          success: false,
          verified: false,
          message: `Code incorrect. ${remaining > 0 ? `${remaining} tentative(s) restante(s).` : 'Code bloqué. Demandez un nouveau code.'}`,
        },
        { status: 400 }
      )
    }

    // ---- Code correct — marquer comme vérifié ----
    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: {
        statut: 'VERIFIED',
        verified_at: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      verified: true,
      message: 'Code vérifié avec succès',
    })
  } catch (error) {
    console.error('[OTP/verify]', error)
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
