import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { confirmPayDunyaTransaction, isPaymentCompleted } from '@/lib/paydunya'

/**
 * Webhook IPN (Instant Payment Notification) — PayDunya
 *
 * PayDunya envoie une requête POST à cette URL après chaque paiement.
 * On vérifie le statut via l'API PayDunya AVANT de créditer le client.
 *
 * Sécurité :
 * - Double vérification : on ne fait jamais confiance au payload brut
 * - On appelle confirmPayDunyaTransaction(token) pour vérifier le statut
 * - Idempotence : on vérifie que la transaction n'a pas déjà été créditée
 *
 * Cette route est PUBLIQUE (pas de middleware auth) car appelée par PayDunya.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // PayDunya envoie le token dans différents chemins selon la version
    console.log('[PayDunya IPN] Payload reçu:', JSON.stringify(body))
    const token = (
      body?.data?.bill?.token ||
      body?.data?.invoice?.token ||
      body?.token
    ) as string | undefined

    if (!token) {
      console.error('[PayDunya IPN] Token manquant dans le payload:', JSON.stringify(body))
      return NextResponse.json({ error: 'Token manquant' }, { status: 400 })
    }

    // 1. Retrouver la transaction en base par le token PayDunya
    const transaction = await prisma.transaction.findFirst({
      where: { paydunya_token: token },
      include: { user: { select: { id: true, solde_sms: true } } },
    })

    if (!transaction) {
      console.error(`[PayDunya IPN] Transaction introuvable pour token: ${token}`)
      // On répond 200 pour éviter les retries PayDunya en boucle
      return NextResponse.json({ ok: true })
    }

    // 2. Idempotence : ne pas créditer deux fois
    if (transaction.statut === 'SUCCESS') {
      console.log(`[PayDunya IPN] Transaction ${token} déjà créditée, ignorée`)
      return NextResponse.json({ ok: true })
    }

    // 3. Vérification côté PayDunya (source de vérité)
    const confirmation = await confirmPayDunyaTransaction(token)

    if (!isPaymentCompleted(confirmation)) {
      // Paiement annulé ou en attente
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          statut: 'FAILED',
          paydunya_data: body as object,
        },
      })
      console.log(`[PayDunya IPN] Paiement non complété pour token: ${token} — statut: ${confirmation.status}`)
      return NextResponse.json({ ok: true })
    }

    // 4. Paiement confirmé → créditer le solde en transaction atomique
    await prisma.$transaction([
      // Mettre à jour la transaction
      prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          statut: 'SUCCESS',
          paydunya_data: body as object,
        },
      }),
      // Créditer le solde SMS du client
      prisma.user.update({
        where: { id: transaction.user_id },
        data: {
          solde_sms: {
            increment: transaction.sms_credites,
          },
        },
      }),
    ])

    console.log(
      `[PayDunya IPN] Paiement confirmé — User: ${transaction.user_id} — +${transaction.sms_credites} SMS — ${transaction.montant_fcfa} FCFA`
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[PayDunya IPN] Erreur webhook:', error)
    // Répondre 200 pour éviter que PayDunya ne spam les retries
    return NextResponse.json({ ok: true })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'PayDunya webhook actif' })
}
