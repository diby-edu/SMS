/**
 * GET /api/otp/stats — Statistiques OTP du client connecté
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const userKeys = await prisma.apiKey.findMany({
    where: { user_id: session.user.id },
    select: { id: true },
  })

  const keyIds = userKeys.map((k) => k.id)

  const [total, verified, failed, thisMonth] = await Promise.all([
    prisma.otpCode.count({ where: { api_key_id: { in: keyIds } } }),
    prisma.otpCode.count({ where: { api_key_id: { in: keyIds }, statut: 'VERIFIED' } }),
    prisma.otpCode.count({
      where: { api_key_id: { in: keyIds }, statut: { in: ['FAILED', 'EXPIRED'] } },
    }),
    prisma.otpCode.count({
      where: {
        api_key_id: { in: keyIds },
        created_at: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
  ])

  const tauxVerification = total > 0 ? Math.round((verified / total) * 100) : 0

  return NextResponse.json({
    total,
    verified,
    failed,
    thisMonth,
    tauxVerification,
  })
}
