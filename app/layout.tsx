import type { Metadata, Viewport } from 'next'
import { Syne, DM_Sans } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import SessionProvider from '@/components/providers/SessionProvider'
import './globals.css'

// ============================================================
// POLICES
// ============================================================

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})

// ============================================================
// MÉTADONNÉES
// ============================================================

export const metadata: Metadata = {
  title: {
    default: 'TextoPro — Plateforme SMS Marketing',
    template: '%s | TextoPro',
  },
  description:
    'Plateforme professionnelle d\'envoi de SMS marketing pour la Côte d\'Ivoire et l\'Afrique de l\'Ouest. Campagnes SMS, envois unitaires, gestion de contacts.',
  keywords: ['SMS marketing', 'Côte d\'Ivoire', 'Afrique de l\'Ouest', 'campagne SMS', 'UEMOA'],
  robots: {
    index: false, // SaaS privé, pas d'indexation
    follow: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // Désactive le zoom sur mobile pour une meilleure UX
  themeColor: '#0A0A0F',
}

// ============================================================
// LAYOUT RACINE
// ============================================================

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="fr"
      className={`${syne.variable} ${dmSans.variable} dark`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground font-sans antialiased">
        <SessionProvider>
          {children}

          {/* Notifications toast globales */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#111118',
                color: '#ffffff',
                border: '1px solid #1E1E2E',
                borderRadius: '10px',
                fontSize: '14px',
              },
              success: {
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#111118',
                },
              },
              error: {
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#111118',
                },
              },
            }}
          />
        </SessionProvider>
      </body>
    </html>
  )
}
