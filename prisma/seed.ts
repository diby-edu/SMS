/**
 * Script de seed Prisma — Création du compte Super Admin
 *
 * Usage :
 *   npx ts-node prisma/seed.ts
 *   ou
 *   npx prisma db seed   (si configuré dans package.json)
 *
 * CE SCRIPT NE DOIT ÊTRE EXÉCUTÉ QU'UNE SEULE FOIS.
 * Il crée le compte Super Admin et la configuration initiale.
 *
 * Modifiez les valeurs ci-dessous AVANT de lancer le script.
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ============================================================
// CONFIGURATION DU COMPTE ADMIN — À MODIFIER
// ============================================================

const ADMIN = {
  prenom: 'Super',
  nom: 'Admin',
  email: 'admin@textopro.com',   // <-- Changer cet email
  password: 'Admin@TextoPro2024', // <-- Changer ce mot de passe
  phone: '+2250700000000',         // <-- Changer ce numéro
  pays: 'CI',
}

// ============================================================
// SEED
// ============================================================

async function main() {
  console.log('Démarrage du seed TextoPro...\n')

  // 1. Créer le compte Super Admin
  const existingAdmin = await prisma.user.findUnique({
    where: { email: ADMIN.email },
  })

  if (existingAdmin) {
    console.log(`Admin déjà existant : ${ADMIN.email}`)
  } else {
    const hashedPassword = await bcrypt.hash(ADMIN.password, 12)

    const admin = await prisma.user.create({
      data: {
        prenom: ADMIN.prenom,
        nom: ADMIN.nom,
        email: ADMIN.email,
        password: hashedPassword,
        phone: ADMIN.phone,
        pays: ADMIN.pays,
        role: 'ADMIN',
        solde_sms: 0,
        is_active: true,
      },
    })

    console.log(`✓ Compte Admin créé : ${admin.email}`)
  }

  // 2. Initialiser la configuration de l'app
  const configCount = await prisma.appConfig.count()

  if (configCount === 0) {
    await prisma.appConfig.create({
      data: {
        prix_sms_fcfa: 30,       // Prix de vente client (FCFA)
        letexto_balance_alert: 1000, // Alerte quand solde LeTexto < 1000 SMS
      },
    })
    console.log('✓ Configuration initiale créée (prix SMS : 30 FCFA)')
  } else {
    console.log('Configuration déjà existante')
  }

  console.log('\nSeed terminé avec succès.')
  console.log('---')
  console.log(`Email admin    : ${ADMIN.email}`)
  console.log(`Mot de passe   : ${ADMIN.password}`)
  console.log('IMPORTANT : Changez le mot de passe après la première connexion !')
}

main()
  .catch((e) => {
    console.error('Erreur seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
