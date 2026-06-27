import { DefaultSession, DefaultUser } from 'next-auth'
import { DefaultJWT } from 'next-auth/jwt'

/**
 * Extension des types NextAuth pour inclure les données métier TextoPro
 * (role, solde_sms, id)
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: 'ADMIN' | 'CLIENT'
      solde_sms: number
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    role: 'ADMIN' | 'CLIENT'
    solde_sms: number
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string
    role: 'ADMIN' | 'CLIENT'
    solde_sms: number
  }
}
