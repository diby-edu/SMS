import LandingPage from '@/components/landing/LandingPage'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TextoPro — Envoyez des SMS professionnels en Côte d\'Ivoire',
  description: 'Plateforme SMS marketing pour les entreprises en Côte d\'Ivoire. SMS promotionnels, transactionnels et OTP. Tarifs dès 20 FCFA/SMS. Démarrez gratuitement.',
  keywords: ['SMS marketing', 'SMS Côte d\'Ivoire', 'envoi SMS professionnel', 'SMS promotionnel', 'SMS transactionnel', 'OTP SMS', 'SMS Abidjan'],
  authors: [{ name: 'TextoPro' }],
  robots: { index: true, follow: true },
  openGraph: {
    title: 'TextoPro — SMS professionnels en Côte d\'Ivoire',
    description: 'Envoyez des SMS en masse, automatisez vos notifications et sécurisez vos connexions avec OTP.',
    url: 'https://sms.numerik360.com',
    siteName: 'TextoPro',
    locale: 'fr_CI',
    type: 'website',
  },
}

// La redirection des utilisateurs connectés est gérée côté client dans LandingPage
export default function HomePage() {
  return <LandingPage />
}
