import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createPayDunyaInvoice } from '@/lib/paydunya'

const MONTANT_MAX = 500000 // 500 000 FCFA maximum

const rechargeSchema = z.object({
  montantFCFA: z
    .number()
    .min(1)
    .max(MONTANT_MAX, `Montant maximum : ${MONTANT_MAX} FCFA`),
})

/**
 * POST /api/recharge
 * Crée une facture PayDunya et retourne l'URL de paiement
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const result = rechargeSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { errors: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { montantFCFA } = result.data

    // Lire la config depuis la base pour le prix SMS et le montant minimum
    const appConfig = await prisma.appConfig.findFirst()
    const prixSMS = appConfig?.prix_sms_fcfa ?? 30
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const montantMin: number = (appConfig as any)?.montant_minimum ?? 500

    if (montantFCFA < montantMin) {
      return NextResponse.json(
        { error: `Montant minimum : ${montantMin.toLocaleString('fr-FR')} FCFA` },
        { status: 400 }
      )
    }

    const smsCredites = Math.floor(montantFCFA / prixSMS)

    if (smsCredites < 1) {
      return NextResponse.json(
        { error: `Montant trop faible. Minimum : ${prixSMS} FCFA pour 1 SMS.` },
        { status: 400 }
      )
    }

    const userId = session.user.id
    const userName = session.user.name || 'Client TextoPro'
    const userEmail = session.user.email || ''

    // Créer la facture PayDunya
    const invoice = await createPayDunyaInvoice({
      montantFCFA,
      smsCredites,
      userId,
      userEmail,
      userName,
    })

    // Enregistrer la transaction PENDING en base
    await prisma.transaction.create({
      data: {
        user_id: userId,
        montant_fcfa: montantFCFA,
        sms_credites: smsCredites,
        statut: 'PENDING',
        paydunya_token: invoice.token,
      },
    })

    if (!invoice.invoice_url) {
      console.error('[Recharge] PayDunya n\'a pas retourné invoice_url', invoice)
      return NextResponse.json(
        { error: 'Impossible d\'obtenir le lien de paiement. Contactez le support.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      invoice_url: invoice.invoice_url,
      token: invoice.token,
      montant_fcfa: montantFCFA,
      sms_credites: smsCredites,
    })
  } catch (error) {
    console.error('[Recharge] Erreur:', error)
    const msg = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json(
      { error: `Impossible de créer la facture : ${msg}` },
      { status: 500 }
    )
  }
}

/**
 * GET /api/recharge — Historique des transactions de l'utilisateur
 */
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // Expirer automatiquement les transactions PENDING de plus de 30 minutes
  const expiryThreshold = new Date(Date.now() - 30 * 60 * 1000)
  await prisma.transaction.updateMany({
    where: {
      user_id: session.user.id,
      statut: 'PENDING',
      created_at: { lt: expiryThreshold },
    },
    data: { statut: 'FAILED' },
  })

  const transactions = await prisma.transaction.findMany({
    where: { user_id: session.user.id },
    select: {
      id: true,
      montant_fcfa: true,
      sms_credites: true,
      statut: true,
      type: true,
      note: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' },
    take: 20,
  })

  return NextResponse.json({ transactions })
}
