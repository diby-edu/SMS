/**
 * GET /api/config/prix
 * Retourne le prix SMS actuel depuis AppConfig (public, pas d'auth requise)
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const config = await prisma.appConfig.findFirst()
    return NextResponse.json({ prix: config?.prix_sms_fcfa ?? 30 })
  } catch {
    return NextResponse.json({ prix: 30 })
  }
}
