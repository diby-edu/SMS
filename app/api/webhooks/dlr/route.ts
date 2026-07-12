import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { MessageStatus } from '@prisma/client'

/**
 * Webhook DLR (Delivery Report) — LeTexto
 * LeTexto envoie POST { id, status, customData } après chaque changement de statut.
 * Route publique (appelée par LeTexto, pas d'auth).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const letextoId = body.id as string | undefined
    const status = (body.status ?? body.statuts) as string | undefined

    if (!letextoId || !status) {
      console.warn(`[DLR] Payload invalide — id: ${letextoId ?? 'absent'}, status: ${status ?? 'absent'}`)
      return NextResponse.json({ ok: true })
    }

    const statusMap: Record<string, MessageStatus> = {
      PENDING: 'PENDING',
      SENT: 'SENT',
      DELIVERED: 'DELIVERED',
      FAILED: 'FAILED',
    }

    const mappedStatus = statusMap[status.toUpperCase()]
    if (!mappedStatus) {
      console.warn(`[DLR] Statut inconnu : ${status}`)
      return NextResponse.json({ ok: true })
    }

    const message = await prisma.message.findFirst({
      where: { letexto_id: letextoId },
      include: { apiKey: { select: { dlr_webhook_url: true } } },
    })

    if (!message) {
      console.warn(`[DLR] Message introuvable : ${letextoId}`)
    } else {
      await prisma.message.update({
        where: { id: message.id },
        data: { statut: mappedStatus },
      })
      console.log(`[DLR] ${letextoId} → ${mappedStatus}`)

      const webhookUrl = message.apiKey?.dlr_webhook_url
      if (webhookUrl) {
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message_id: message.id,
            letexto_id: letextoId,
            status: mappedStatus,
            phone: message.destinataire,
            sender: message.sender,
            timestamp: new Date().toISOString(),
          }),
        }).catch((e) => console.warn(`[DLR] Échec forward: ${e.message}`))
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[DLR] Erreur:', error)
    return NextResponse.json({ ok: true })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'DLR webhook actif' })
}
