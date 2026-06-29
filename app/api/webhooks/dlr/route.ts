import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { MessageStatus } from '@prisma/client'

/**
 * Webhook DLR (Delivery Report) — LeTexto
 *
 * LeTexto envoie une requête POST à cette URL après chaque changement
 * de statut d'un message SMS.
 *
 * Payload reçu :
 * {
 *   id: string        — identifiant unique du message chez LeTexto
 *   statuts: string   — "PENDING" | "SENT" | "DELIVERED" | "FAILED"
 * }
 *
 * Cette route est PUBLIQUE (pas de middleware auth) car appelée par LeTexto.
 * Elle est exclue du matcher du middleware.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const letextoId = body.id as string | undefined
    const status = body.statuts as string | undefined

    // Validation minimale
    if (!letextoId || !status) {
      return NextResponse.json(
        { error: 'Paramètres manquants : id et statuts requis' },
        { status: 400 }
      )
    }

    // Mapping des statuts LeTexto → notre enum MessageStatus
    const statusMap: Record<string, MessageStatus> = {
      PENDING: 'PENDING',
      SENT: 'SENT',
      DELIVERED: 'DELIVERED',
      FAILED: 'FAILED',
    }

    const mappedStatus = statusMap[status.toUpperCase()]
    if (!mappedStatus) {
      console.warn(`[DLR] Statut inconnu reçu : ${status}`)
      return NextResponse.json({ ok: true }) // On accepte quand même pour éviter les retries
    }

    // Mise à jour du message en base par son letexto_id
    const message = await prisma.message.findFirst({
      where: { letexto_id: letextoId },
      include: { apiKey: { select: { dlr_webhook_url: true } } },
    })

    if (!message) {
      console.warn(`[DLR] Aucun message trouvé avec letexto_id: ${letextoId}`)
    } else {
      await prisma.message.update({
        where: { id: message.id },
        data: { statut: mappedStatus },
      })
      console.log(`[DLR] Message ${letextoId} → statut mis à jour : ${mappedStatus}`)

      // Forward vers le webhook DLR du client si configuré
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
        }).catch((e) => console.warn(`[DLR] Échec forward webhook client: ${e.message}`))
      }
    }

    // Répondre 200 rapidement pour éviter les retries de LeTexto
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[DLR] Erreur webhook:', error)
    // On répond 200 quand même pour éviter une boucle de retries
    return NextResponse.json({ ok: true })
  }
}

// LeTexto peut aussi envoyer des GET pour vérifier l'endpoint
export async function GET() {
  return NextResponse.json({ status: 'DLR webhook actif' })
}
