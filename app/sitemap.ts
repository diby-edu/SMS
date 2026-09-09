import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXTAUTH_URL || 'https://sms.numerik360.com'

/**
 * Sitemap — pages publiques uniquement.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/register`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ]
}
