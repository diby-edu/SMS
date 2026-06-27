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
    const updated = await prisma.message.updateMany({
      where: { letexto_id: letextoId },
      data: { statut: mappedStatus },
    })

    if (updated.count === 0) {
      // Peut arriver si le message n'existe pas encore en base (race condition)
      console.warn(`[DLR] Aucun message trouvé avec letexto_id: ${letextoId}`)
    } else {
      console.log(`[DLR] Message ${letextoId} → statut mis à jour : ${mappedStatus}`)
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
