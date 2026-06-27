import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const configSchema = z.object({
  prix_sms_fcfa: z.number().min(1).max(1000).optional(),
  letexto_balance_alert: z.number().min(0).optional(),
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
    ? await prisma.appConfig.update({ where: { id: existing.id }, data: result.data })
    : await prisma.appConfig.create({ data: { ...result.data, prix_sms_fcfa: result.data.prix_sms_fcfa ?? 30 } })

  return NextResponse.json({ config })
}
