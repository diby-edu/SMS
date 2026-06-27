import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

// ============================================================
// VALIDATION SCHEMA
// ============================================================

const PAYS_VALIDES = ['CI', 'SN', 'ML', 'BF', 'GN', 'TG', 'BJ', 'NE'] as const

const registerSchema = z.object({
  nom: z
    .string()
    .min(2, 'Le nom doit avoir au moins 2 caractères')
    .max(50, 'Le nom est trop long')
    .trim(),
  prenom: z
    .string()
    .min(2, 'Le prénom doit avoir au moins 2 caractères')
    .max(50, 'Le prénom est trop long')
    .trim(),
  email: z
    .string()
    .email('Adresse email invalide')
    .toLowerCase()
    .trim(),
  phone: z
    .string()
    .min(8, 'Numéro de téléphone invalide')
    .max(20, 'Numéro de téléphone invalide')
    .trim(),
  pays: z.enum(PAYS_VALIDES, {
    errorMap: () => ({ message: 'Veuillez sélectionner un pays valide' }),
  }),
  password: z
    .string()
    .min(8, 'Le mot de passe doit avoir au moins 8 caractères')
    .max(100),
})

// ============================================================
// HANDLER
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validation des champs
    const result = registerSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { errors: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { nom, prenom, email, phone, pays, password } = result.data

    // Vérifier l'unicité de l'email
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (existing) {
      return NextResponse.json(
        { errors: { email: ['Cette adresse email est déjà utilisée'] } },
        { status: 409 }
      )
    }

    // Hash du mot de passe — coût 12 pour un bon équilibre sécurité/perf
    const hashedPassword = await bcrypt.hash(password, 12)

    // Création de l'utilisateur
    await prisma.user.create({
      data: {
        nom,
        prenom,
        email,
        phone,
        pays,
        password: hashedPassword,
        role: 'CLIENT',
        solde_sms: 0,
        is_active: true,
      },
    })

    // Initialiser la configuration de l'app si c'est le premier utilisateur
    const configCount = await prisma.appConfig.count()
    if (configCount === 0) {
      await prisma.appConfig.create({
        data: {
          prix_sms_fcfa: 30,
          letexto_balance_alert: 1000,
        },
      })
    }

    return NextResponse.json(
      { message: 'Compte créé avec succès. Vous pouvez maintenant vous connecter.' },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Register] Erreur:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue. Veuillez réessayer.' },
      { status: 500 }
    )
  }
}
