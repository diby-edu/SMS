import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendSingleSMS, calculateSMSParts } from '@/lib/letexto'
import { interpolateMessage } from '@/lib/utils'
import { rateLimit, tooManyRequests } from '@/lib/rateLimit'

// Exécute `fn` sur chaque élément avec une concurrence bornée
// (évite d'ouvrir des milliers de connexions HTTP simultanées vers LeTexto)
async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++
      try {
        results[i] = { status: 'fulfilled', value: await fn(items[i], i) }
      } catch (reason) {
        results[i] = { status: 'rejected', reason }
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  )
  return results
}

// ============================================================
// VALIDATION
// ============================================================

const campaignSchema = z.object({
  label: z.string().min(1, 'Nom de campagne requis').max(100).trim(),
  sender: z.string().min(2, 'Sender requis').max(11).trim(),
  content: z.string().min(1, 'Message vide').max(918).trim(),
  contacts: z
    .array(z.object({ phone: z.string().min(8) }).catchall(z.string()))
    .optional(),
  group_id: z.string().optional(),
})

// ============================================================
// POST /api/campaigns
// ============================================================

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await req.json()

    // La programmation d'envoi n'est pas encore implémentée côté serveur :
    // on refuse explicitement plutôt que d'envoyer immédiatement en silence.
    if (body?.scheduled_at) {
      return NextResponse.json(
        { error: "La programmation d'envoi n'est pas encore disponible. Retirez la date pour un envoi immédiat." },
        { status: 400 }
      )
    }

    const result = campaignSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { errors: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { label, sender, content, group_id } = result.data
    const userId = session.user.id

    // Rate limiting par utilisateur (une campagne = beaucoup de SMS)
    const rl = rateLimit(`campaign:${userId}`, 10, 60 * 1000)
    if (!rl.allowed) return tooManyRequests(rl.retryAfterSec)

    // Vérifier que le sender appartient à l'utilisateur, est approuvé, et n'est PAS de type OTP
    const approvedSender = await prisma.sender.findFirst({
      where: { user_id: userId, nom: sender, statut: 'APPROVED', type_message: { not: 'OTP' } },
    })
    if (!approvedSender) {
      return NextResponse.json(
        { error: 'Expéditeur invalide, non approuvé, ou de type OTP (réservé aux codes OTP)' },
        { status: 403 }
      )
    }

    // Résolution des contacts (tableau direct ou depuis un groupe)
    let contacts: Array<{ phone: string } & Record<string, string>>
    if (group_id) {
      const groupContacts = await prisma.contact.findMany({
        where: { liste_id: group_id, user_id: userId },
        select: { phone: true, nom: true, prenom: true },
      })
      if (groupContacts.length === 0) {
        return NextResponse.json({ error: 'Le groupe sélectionné est vide' }, { status: 400 })
      }
      contacts = groupContacts.map((c) => ({
        phone: c.phone,
        ...(c.nom ? { nom: c.nom } : {}),
        ...(c.prenom ? { prenom: c.prenom } : {}),
      }))
    } else if (result.data.contacts && result.data.contacts.length > 0) {
      contacts = result.data.contacts as Array<{ phone: string } & Record<string, string>>
    } else {
      return NextResponse.json({ error: 'Ajoutez au moins un contact' }, { status: 400 })
    }

    const nbContacts = contacts.length
    // Calculer le coût réel avant le débit (1 SMS ≠ 1 part si message > 160 chars)
    const partCount = calculateSMSParts(content)
    const totalCost = nbContacts * partCount

    // Débit atomique : check solde + décrémentation en une seule requête SQL
    // Évite la race condition (deux requêtes simultanées ne peuvent pas toutes deux passer)
    const debitResult = await prisma.user.updateMany({
      where: { id: userId, is_active: true, solde_sms: { gte: totalCost } },
      data: { solde_sms: { decrement: totalCost } },
    })

    if (debitResult.count === 0) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { is_active: true, solde_sms: true },
      })
      if (!user?.is_active) {
        return NextResponse.json({ error: 'Compte désactivé' }, { status: 403 })
      }
      return NextResponse.json(
        {
          error: `Solde insuffisant. La campagne nécessite ${totalCost} SMS, vous en avez ${user?.solde_sms ?? 0}.`,
          required: totalCost,
          solde_actuel: user?.solde_sms ?? 0,
        },
        { status: 402 }
      )
    }

    // Création de la campagne en DB
    const campaign = await prisma.campaign.create({
      data: {
        user_id: userId,
        label,
        sender_nom: sender,
        contenu: content,
        nb_contacts: nbContacts,
        cost_sms: totalCost,
        statut: 'CREATED',
      },
    })

    // Contenu personnalisé par contact ({nom}, {prenom}, {telephone})
    const buildContent = (c: { phone: string } & Record<string, string>) =>
      interpolateMessage(content, { ...c, telephone: c.phone })

    // Envois avec concurrence bornée (max 20 en parallèle) — séparés des écritures DB
    const sendResults = await runWithConcurrency(contacts, 20, (contact) =>
      sendSingleSMS({ from: sender, to: contact.phone, content: buildContent(contact) })
    )

    type SuccessEntry = { phone: string; letextoId: string; contenu: string }
    const successes: SuccessEntry[] = []
    sendResults.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        successes.push({
          phone: contacts[i].phone,
          letextoId: r.value.id,
          contenu: buildContent(contacts[i]),
        })
      }
    })

    const nbSuccess = successes.length
    const nbFailed = nbContacts - nbSuccess

    // Écriture des Message rows en une seule requête (createMany)
    if (successes.length > 0) {
      await prisma.message.createMany({
        data: successes.map(({ phone, letextoId, contenu }) => ({
          user_id: userId,
          sender,
          destinataire: phone,
          contenu,
          statut: 'SENT',
          letexto_id: letextoId,
          cost_sms: partCount,
          campaign_id: campaign.id,
        })),
      })
    }

    // Remboursement intégral si aucun SMS n'est parti
    if (nbSuccess === 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { solde_sms: { increment: totalCost } },
      })
    }

    // Mise à jour du statut campagne — non-bloquant si la DB plante ici
    // (les SMS ont déjà été envoyés, on ne veut pas masquer le résultat)
    try {
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          statut: nbFailed === nbContacts ? 'FAILED' : 'SENT',
          nb_success: nbSuccess,
          nb_failed: nbFailed,
        },
      })
    } catch (e) {
      console.error('[Campaign] Erreur mise à jour statut campagne:', e)
    }

    if (nbSuccess === 0) {
      return NextResponse.json(
        { error: "L'envoi a échoué pour tous les contacts. Contactez le support.", campaign_id: campaign.id },
        { status: 502 }
      )
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { solde_sms: true },
    })

    return NextResponse.json({
      success: true,
      campaign_id: campaign.id,
      nb_contacts: nbContacts,
      nb_success: nbSuccess,
      nb_failed: nbFailed,
      solde_restant: updatedUser?.solde_sms ?? 0,
    })
  } catch (error) {
    console.error('[Campaign] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// ============================================================
// GET /api/campaigns — Liste des campagnes de l'utilisateur
// ============================================================

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 10
  const skip = (page - 1) * limit

  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where: { user_id: session.user.id },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
    prisma.campaign.count({ where: { user_id: session.user.id } }),
  ])

  return NextResponse.json({ campaigns, total, page, totalPages: Math.ceil(total / limit) })
}
