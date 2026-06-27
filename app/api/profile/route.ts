import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const PAYS_VALIDES = ['CI', 'SN', 'ML', 'BF', 'GN', 'TG', 'BJ', 'NE'] as const

/**
 * GET /api/profile
 * Retourne les infos du profil de l'utilisateur connecté
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      nom: true,
      prenom: true,
      email: true,
      phone: true,
      pays: true,
      solde_sms: true,
      created_at: true,
    },
  })

  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

  return NextResponse.json({ user })
}

/**
 * PATCH /api/profile
 * Met à jour les infos du profil ou change le mot de passe.
 * Body (infos) : { nom, prenom, phone, pays }
 * Body (mdp)   : { currentPassword, newPassword }
 */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()

  // ---- Changement de mot de passe ----
  if (body.currentPassword !== undefined || body.newPassword !== undefined) {
    const schema = z.object({
      currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
      newPassword: z.string().min(8, 'Nouveau mot de passe trop court (min 8 caractères)').max(100),
    })

    const result = schema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { errors: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { currentPassword, newPassword } = result.data

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    })
    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

    const isValid = await bcrypt.compare(currentPassword, user.password)
    if (!isValid) {
      return NextResponse.json(
        { errors: { currentPassword: ['Mot de passe actuel incorrect'] } },
        { status: 400 }
      )
    }

    const hashed = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashed },
    })

    return NextResponse.json({ message: 'Mot de passe mis à jour avec succès' })
  }

  // ---- Mise à jour des infos ----
  const schema = z.object({
    nom: z.string().min(2, 'Nom trop court').max(50).trim(),
    prenom: z.string().min(2, 'Prénom trop court').max(50).trim(),
    phone: z.string().min(8, 'Numéro invalide').max(20).trim(),
    pays: z.enum(PAYS_VALIDES, { errorMap: () => ({ message: 'Pays invalide' }) }),
  })

  const result = schema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { errors: result.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: result.data,
    select: { id: true, nom: true, prenom: true, email: true, phone: true, pays: true },
  })

  return NextResponse.json({ user: updated })
}
