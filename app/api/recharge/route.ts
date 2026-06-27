import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createPayDunyaInvoice } from '@/lib/paydunya'

const PRIX_SMS = parseInt(process.env.NEXT_PUBLIC_PRIX_SMS || '30')
const MONTANT_MIN = 500   // 500 FCFA minimum
const MONTANT_MAX = 500000 // 500 000 FCFA maximum

const rechargeSchema = z.object({
  montantFCFA: z
    .number()
    .min(MONTANT_MIN, `Montant minimum : ${MONTANT_MIN} FCFA`)
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
    const smsCredites = Math.floor(montantFCFA / PRIX_SMS)

    if (smsCredites < 1) {
      return NextResponse.json(
        { error: `Montant trop faible. Minimum : ${PRIX_SMS} FCFA pour 1 SMS.` },
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

    return NextResponse.json({
      invoice_url: invoice.invoice_url,
      token: invoice.token,
      montant_fcfa: montantFCFA,
      sms_credites: smsCredites,
    })
  } catch (error) {
    console.error('[Recharge] Erreur:', error)
    return NextResponse.json(
      { error: 'Impossible de créer la facture de paiement. Réessayez.' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/recharge — Historique des transactions de l'utilisateur
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const transactions = await prisma.transaction.findMany({
    where: { user_id: session.user.id },
    select: {
      id: true,
      montant_fcfa: true,
      sms_credites: true,
      statut: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' },
    take: 20,
  })

  return NextResponse.json({ transactions })
}
