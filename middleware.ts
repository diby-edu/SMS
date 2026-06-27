import { withAuth, NextRequestWithAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

/**
 * Middleware d'authentification et d'autorisation
 *
 * Protège toutes les routes de l'application.
 * - Routes /admin/* : accessibles uniquement aux ADMIN
 * - Routes dashboard/* et autres : accessibles aux utilisateurs connectés
 * - Toute tentative non autorisée → redirection vers /login
 */
export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // Protection des routes admin
    if (pathname.startsWith('/admin') && token?.role !== 'ADMIN') {
      // Un CLIENT qui tente d'accéder à /admin → redirigé vers son dashboard
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      // Autorisé = token JWT valide
      authorized: ({ token }) => !!token,
    },
  }
)

/**
 * Routes protégées par le middleware
 * Les routes /api/auth/* et /login /register sont exclues (publiques)
 */
export const config = {
  matcher: [
    // Routes client
    '/dashboard/:path*',
    '/sms/:path*',
    '/campagnes/:path*',
    '/historique/:path*',
    '/recharge/:path*',
    '/contacts/:path*',
    '/senders/:path*',
    '/profil/:path*',
    // Routes admin
    '/admin/:path*',
    // Routes API protégées (hors auth et webhooks)
    '/api/sms/:path*',
    '/api/campaigns/:path*',
    '/api/contacts/:path*',
    '/api/balance/:path*',
    '/api/admin/:path*',
    '/api/recharge/:path*',
  ],
}
