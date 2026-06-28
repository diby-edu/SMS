/**
 * GET /api/config/prix
 * Retourne la config de recharge (prix SMS, montants rapides, montant minimum, paliers)
 * Public — pas d'auth requise
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const DEFAULT_PALIERS = [
  { montant: 10000,   taux: 30 },
  { montant: 25000,   taux: 28 },
  { montant: 50000,   taux: 26 },
  { montant: 100000,  taux: 24 },
  { montant: 500000,  taux: 21 },
  { montant: 1000000, taux: 20 },
]

export async function GET() {
  try {
    const config = await prisma.appConfig.findFirst()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paliersRaw = (config as any)?.paliers_prix
    const paliers = Array.isArray(paliersRaw) && paliersRaw.length > 0
      ? paliersRaw
      : DEFAULT_PALIERS

    return NextResponse.json({
      prix: config?.prix_sms_fcfa ?? 30,
      montant_minimum: config?.montant_minimum ?? 500,
      montants_rapides: (config?.montants_rapides as number[]) ?? [1000, 3000, 5000, 10000, 25000, 50000],
      paliers,
    })
  } catch {
    return NextResponse.json({
      prix: 30,
      montant_minimum: 500,
      montants_rapides: [1000, 3000, 5000, 10000, 25000, 50000],
      paliers: DEFAULT_PALIERS,
    })
  }
}
