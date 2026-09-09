import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXTAUTH_URL || 'https://sms.numerik360.com'

/**
 * robots.txt — n'indexe que la landing publique, bloque l'espace applicatif.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/admin',
          '/sms',
          '/campagnes',
          '/contacts',
          '/senders',
          '/historique',
          '/recharge',
          '/profil',
          '/otp',
          '/transactionnel',
          '/api/',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
