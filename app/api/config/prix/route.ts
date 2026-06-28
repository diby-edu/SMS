/**
 * GET /api/config/prix
 * Retourne la config de recharge (prix SMS, montants rapides, montant minimum)
 * Public — pas d'auth requise
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const config = await prisma.appConfig.findFirst()
    return NextResponse.json({
      prix: config?.prix_sms_fcfa ?? 30,
      montant_minimum: config?.montant_minimum ?? 500,
      montants_rapides: (config?.montants_rapides as number[]) ?? [1000, 3000, 5000, 10000, 25000, 50000],
    })
  } catch {
    return NextResponse.json({
      prix: 30,
      montant_minimum: 500,
      montants_rapides: [1000, 3000, 5000, 10000, 25000, 50000],
    })
  }
}
