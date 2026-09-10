/** @type {import('next').NextConfig} */

// Content-Security-Policy — pragmatique pour une app Next.js (hydration inline).
// 'unsafe-inline' reste nécessaire pour les styles et le bootstrap Next ;
// à durcir ensuite avec des nonces si besoin.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

const nextConfig = {
  // N'expose pas l'en-tête X-Powered-By: Next.js
  poweredByHeader: false,

  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
    // Active instrumentation.ts (chargement de la config Sentry serveur/edge)
    instrumentationHook: true,
  },
  images: {
    remotePatterns: [],
  },
  // Headers de sécurité
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ]
  },
}

// Sentry n'enveloppe le build QUE si un DSN est configuré (sinon aucune surcharge)
const { withSentryConfig } = require('@sentry/nextjs')

module.exports = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      disableLogger: true,
      // Upload des source maps seulement si un token d'auth est fourni
      sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
    })
  : nextConfig
