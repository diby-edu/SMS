import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  // Stratégie JWT — pas de session en base de données
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },

  // Pages personnalisées
  pages: {
    signIn: '/login',
    error: '/login',
  },

  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email et mot de passe requis')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        })

        if (!user) {
          throw new Error('Email ou mot de passe incorrect')
        }

        if (!user.is_active) {
          throw new Error(
            'Votre compte a été désactivé. Contactez le support.'
          )
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          throw new Error('Email ou mot de passe incorrect')
        }

        // Objet retourné → injecté dans le JWT via le callback jwt()
        return {
          id: user.id,
          email: user.email,
          name: `${user.prenom} ${user.nom}`,
          role: user.role,
          solde_sms: user.solde_sms,
        }
      },
    }),
  ],

  callbacks: {
    /**
     * Appelé à la création et au rafraîchissement du JWT
     * On stocke les données métier dans le token
     */
    async jwt({ token, user, trigger, session }) {
      // Première connexion : on hydrate le token depuis l'objet user
      if (user) {
        token.id = user.id
        token.role = (user as { role: string }).role
        token.solde_sms = (user as { solde_sms: number }).solde_sms
      }

      // Mise à jour du solde après une recharge
      // Déclenché par : update(session) côté client
      if (trigger === 'update' && session?.solde_sms !== undefined) {
        token.solde_sms = session.solde_sms
      }

      // Synchronisation du solde depuis la base à chaque refresh
      // Optionnel : évite le solde périmé dans le JWT
      if (trigger === 'update' && session?.refreshSolde) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { solde_sms: true },
        })
        if (dbUser) {
          token.solde_sms = dbUser.solde_sms
        }
      }

      return token
    },

    /**
     * Appelé à chaque requête pour construire l'objet session côté client
     * Ne jamais mettre de données sensibles ici (visible côté client)
     */
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.solde_sms = token.solde_sms as number
      }
      return session
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
}
