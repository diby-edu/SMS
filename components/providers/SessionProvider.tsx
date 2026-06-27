'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import type { Session } from 'next-auth'

interface Props {
  children: React.ReactNode
  session?: Session | null
}

/**
 * Wrapper client pour NextAuth SessionProvider
 * Nécessaire car app/layout.tsx est un Server Component
 */
export default function SessionProvider({ children, session }: Props) {
  return (
    <NextAuthSessionProvider session={session}>
      {children}
    </NextAuthSessionProvider>
  )
}
