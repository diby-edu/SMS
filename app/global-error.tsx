'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
    console.error('[Global Error]', error)
  }, [error])

  return (
    <html lang="fr">
      <body style={{ background: '#0A0A0F', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Une erreur critique est survenue
          </h1>
          <p style={{ color: '#94A3B8', marginBottom: '2rem' }}>
            L&apos;application a rencontré un problème. Rechargez la page.
          </p>
          <button
            onClick={reset}
            style={{
              background: '#00D4FF',
              color: '#0A0A0F',
              fontWeight: 600,
              padding: '0.625rem 1.25rem',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  )
}
