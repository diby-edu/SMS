import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const palierSchema = z.object({
  montant: z.number().min(1),
  taux: z.number().min(1).max(1000),
})

const configSchema = z.object({
  prix_sms_fcfa: z.number().min(1).max(1000).optional(),
  letexto_balance_alert: z.number().min(0).optional(),
  montant_minimum: z.number().min(100).max(100000).optional(),
  montants_rapides: z.array(z.number().min(100).max(1000000)).min(1).max(10).optional(),
  paliers_prix: z.array(palierSchema).min(1).max(20).optional(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const config = await prisma.appConfig.findFirst()
  return NextResponse.json({ config })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const body = await req.json()
  const result = configSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ errors: result.error.flatten().fieldErrors }, { status: 400 })
  }

  const existing = await prisma.appConfig.findFirst()

  const config = existing
    ? await prisma.appConfig.update({ where: { id: existing.id }, data: result.data as Record<string, unknown> })
    : await prisma.appConfig.create({ data: { prix_sms_fcfa: 30, ...(result.data as Record<string, unknown>) } })

  return NextResponse.json({ config })
}
