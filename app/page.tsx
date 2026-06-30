import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import LandingPage from '@/components/landing/LandingPage'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

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

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'TextoPro',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: 'https://sms.numerik360.com',
      description: 'Plateforme SMS professionnelle pour les entreprises en Côte d\'Ivoire',
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'XOF',
        lowPrice: '20',
        highPrice: '30',
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Comment fonctionne TextoPro ?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'TextoPro est une plateforme en ligne. Créez un compte, rechargez votre solde SMS et commencez à envoyer des SMS en quelques minutes.',
          },
        },
        {
          '@type': 'Question',
          name: 'Quels opérateurs sont supportés en Côte d\'Ivoire ?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'TextoPro supporte Orange CI, MTN CI, Moov Africa, Wave et tous les opérateurs mobiles en Côte d\'Ivoire.',
          },
        },
        {
          '@type': 'Question',
          name: 'Quel est le tarif par SMS ?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Les tarifs varient de 20 à 30 FCFA par SMS selon le volume. Plus vous achetez, moins c\'est cher.',
          },
        },
      ],
    },
  ],
}

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  if (session) {
    if (session.user.role === 'ADMIN') {
      redirect('/admin')
    }
    redirect('/dashboard')
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage />
    </>
  )
}
