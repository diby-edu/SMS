import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { confirmPayDunyaTransaction, isPaymentCompleted } from '@/lib/paydunya'

/**
 * POST /api/recharge/confirm
 * Appelé depuis la page success quand PayDunya redirige l'utilisateur.
 * Vérifie le paiement et crédite le solde si ce n'est pas déjà fait.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const { token } = await req.json()
    if (!token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 400 })
    }

    const transaction = await prisma.transaction.findFirst({
      where: { paydunya_token: token, user_id: session.user.id },
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction introuvable' }, { status: 404 })
    }

    // Déjà crédité
    if (transaction.statut === 'SUCCESS') {
      return NextResponse.json({ ok: true, already: true, sms_credites: transaction.sms_credites })
    }

    // Vérifier auprès de PayDunya
    const confirmation = await confirmPayDunyaTransaction(token)
    console.log('[Confirm] PayDunya status:', confirmation.status, 'token:', token)

    if (!isPaymentCompleted(confirmation)) {
      return NextResponse.json({ ok: false, status: confirmation.status })
    }

    // Créditer en transaction atomique
    await prisma.$transaction([
      prisma.transaction.update({
        where: { id: transaction.id },
        data: { statut: 'SUCCESS' },
      }),
      prisma.user.update({
        where: { id: transaction.user_id },
        data: { solde_sms: { increment: transaction.sms_credites } },
      }),
    ])

    console.log(`[Confirm] Crédité: user=${session.user.id} +${transaction.sms_credites} SMS`)
    return NextResponse.json({ ok: true, sms_credites: transaction.sms_credites })
  } catch (error) {
    console.error('[Confirm] Erreur:', error)
    return NextResponse.json({ error: 'Erreur lors de la confirmation' }, { status: 500 })
  }
}
