import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendSingleSMS, calculateSMSParts } from '@/lib/letexto'

/**
 * POST /api/webhooks/chariow/[token]
 * Webhook receiver pour les pulses Chariow.
 * Route PUBLIQUE — authentification via token unique dans l'URL.
 *
 * Chariow envoie un POST avec le payload de l'événement.
 * On extrait le numéro de téléphone, on construit le SMS et on l'envoie.
 */

const CHARIOW_EVENTS: Record<string, string> = {
  'successful.sale': 'Vente réussie',
  'abandoned.sale': 'Vente abandonnée',
  'failed.sale': 'Vente échouée',
  'license.activated': 'Licence activée',
  'license.expired': 'Licence expirée',
  'license.issued': 'Licence émise',
  'license.revoked': 'Licence révoquée',
  'affiliate.joined': 'Affilié a rejoint',
}

type ChariowPayload = {
  event: string
  customer?: {
    first_name?: string
    name?: string
    phone?: string
  }
  product?: {
    name?: string
    url?: string
  }
  sale?: {
    amount?: { formatted?: string }
  }
  license?: {
    key?: string
  }
  store?: {
    name?: string
    url?: string
  }
  checkout?: {
    url?: string
  }
  affiliate?: {
    account?: {
      first_name?: string
      name?: string
      phone?: { formatted?: string }
    }
  }
}

function extractPhone(payload: ChariowPayload): string | null {
  if (payload.event === 'affiliate.joined') {
    const raw = payload.affiliate?.account?.phone?.formatted
    if (!raw) return null
    return raw.replace(/\s/g, '')
  }
  return payload.customer?.phone?.replace(/\s/g, '') ?? null
}

function buildSmsMessage(payload: ChariowPayload): string {
  const event = payload.event
  const prenom =
    payload.customer?.first_name ||
    payload.customer?.name?.split(' ')[0] ||
    (event === 'affiliate.joined'
      ? payload.affiliate?.account?.first_name ||
        payload.affiliate?.account?.name?.split(' ')[0]
      : null) ||
    'Client'

  const produit = payload.product?.name || 'votre produit'
  const montant = payload.sale?.amount?.formatted || ''
  const cle = payload.license?.key || ''
  const boutique = payload.store?.name || ''
  const urlAchat = payload.checkout?.url || payload.product?.url || payload.store?.url || ''
  const urlProduit = payload.product?.url || payload.store?.url || ''

  switch (event) {
    case 'successful.sale':
      return `Bonjour ${prenom}, votre paiement${montant ? ` de ${montant}` : ''} pour ${produit} a bien ete recu. Merci pour votre achat !`
    case 'abandoned.sale':
      return `Bonjour ${prenom}, vous avez laisse ${produit}${montant ? ` (${montant})` : ''} dans votre panier. Finalisez votre commande${urlAchat ? ` : ${urlAchat}` : '.'}`
    case 'failed.sale':
      return `Bonjour ${prenom}, votre paiement${montant ? ` de ${montant}` : ''} pour ${produit} n'a pas pu etre traite. Reessayez${urlProduit ? ` : ${urlProduit}` : '.'}`
    case 'license.activated':
      return `Bonjour ${prenom}, votre licence${cle ? ` ${cle}` : ''} pour ${produit} est maintenant active.`
    case 'license.expired':
      return `Bonjour ${prenom}, votre licence pour ${produit} a expire.${boutique ? ` Renouvelez sur ${boutique}.` : ''}`
    case 'license.issued':
      return `Bonjour ${prenom}, votre licence${cle ? ` ${cle}` : ''} pour ${produit} a ete emise.`
    case 'license.revoked':
      return `Bonjour ${prenom}, votre licence pour ${produit} a ete revoquee. Contactez le support.`
    case 'affiliate.joined':
      return `Bonjour ${prenom}, bienvenue dans le programme d'affiliation${boutique ? ` de ${boutique}` : ''} !`
    default:
      return ''
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  // Répondre rapidement pour éviter les retries Chariow
  try {
    const { token } = params

    // Trouver la config par token
    const config = await prisma.chariowConfig.findUnique({
      where: { token },
      include: { user: { select: { id: true, solde_sms: true, is_active: true } } },
    })

    if (!config || !config.is_active) {
      return NextResponse.json({ ok: true }) // Silencieux pour éviter les retries
    }

    if (!config.user.is_active) {
      return NextResponse.json({ ok: true })
    }

    const payload: ChariowPayload = await req.json()
    const event = payload.event

    // Vérifier que l'événement est connu
    if (!event || !CHARIOW_EVENTS[event]) {
      console.log(`[Chariow] Événement inconnu: ${event}`)
      return NextResponse.json({ ok: true })
    }

    // Vérifier que l'événement n'est pas désactivé
    if (config.events_disabled.includes(event)) {
      console.log(`[Chariow] Événement désactivé: ${event}`)
      return NextResponse.json({ ok: true })
    }

    // Extraire le numéro de téléphone
    const phone = extractPhone(payload)
    if (!phone) {
      console.warn(`[Chariow] Numéro de téléphone absent pour l'événement ${event}`)
      return NextResponse.json({ ok: true })
    }

    // Valider le format du numéro
    const phoneClean = phone.replace(/\s/g, '')
    if (!/^\+?[1-9]\d{7,14}$/.test(phoneClean)) {
      console.warn(`[Chariow] Numéro invalide: ${phoneClean}`)
      return NextResponse.json({ ok: true })
    }

    // Construire le message SMS
    const smsContent = buildSmsMessage(payload)
    if (!smsContent) {
      console.warn(`[Chariow] Message vide pour l'événement ${event}`)
      return NextResponse.json({ ok: true })
    }

    // Vérifier le solde
    const costSms = calculateSMSParts(smsContent)
    if (config.user.solde_sms < costSms) {
      console.warn(`[Chariow] Solde insuffisant pour user ${config.user_id}`)
      return NextResponse.json({ ok: true })
    }

    // Enregistrer le message en base
    const messageRecord = await prisma.message.create({
      data: {
        user_id: config.user_id,
        sender: config.sender,
        destinataire: phoneClean,
        contenu: smsContent,
        cost_sms: costSms,
      },
    })

    // Envoyer via LeTexto (fire-and-forget asynchrone)
    sendSingleSMS({ from: config.sender, to: phoneClean, content: smsContent })
      .then(async (result) => {
        await prisma.message.update({
          where: { id: messageRecord.id },
          data: { statut: 'SENT', letexto_id: result.id?.toString() ?? null },
        })
        await prisma.user.update({
          where: { id: config.user_id },
          data: { solde_sms: { decrement: costSms } },
        })
        console.log(`[Chariow] SMS envoyé à ${phoneClean} pour event ${event}`)
      })
      .catch(async (err) => {
        await prisma.message.update({
          where: { id: messageRecord.id },
          data: { statut: 'FAILED' },
        })
        const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message
        console.error(`[Chariow] Échec envoi SMS vers ${phoneClean} (sender: ${config.sender}, event: ${event}): ${detail}`)
      })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Chariow webhook]', error)
    return NextResponse.json({ ok: true }) // Toujours 200 pour éviter les retries
  }
}

// Chariow peut tester l'endpoint avec un GET
export async function GET() {
  return NextResponse.json({ status: 'Chariow webhook actif' })
}
