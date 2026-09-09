'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Point d'accroche pour un service de monitoring (ex: Sentry.captureException)
    console.error('[App Error]', error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-6 text-center">
      <h1 className="font-syne text-2xl font-bold mb-3">Une erreur est survenue</h1>
      <p className="text-foreground-muted mb-8 max-w-md">
        Un problème inattendu s&apos;est produit. Vous pouvez réessayer.
        {error.digest && (
          <span className="block mt-2 text-xs text-foreground-subtle">
            Référence : {error.digest}
          </span>
        )}
      </p>
      <button
        onClick={reset}
        className="bg-primary text-background font-semibold px-5 py-2.5 rounded-lg hover:bg-primary-hover transition-colors"
      >
        Réessayer
      </button>
    </div>
  )
}
