import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/recharge/cancel
 * Appelé depuis la page /recharge/cancel quand PayDunya redirige après annulation.
 * Marque la transaction correspondante comme FAILED.
 */
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()
    if (!token) return NextResponse.json({ ok: false }, { status: 400 })

    await prisma.transaction.updateMany({
      where: { paydunya_token: token, statut: 'PENDING' },
      data: { statut: 'FAILED' },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
