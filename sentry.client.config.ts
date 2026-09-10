// Configuration Sentry — côté navigateur (client)
// Ne s'initialise que si un DSN est fourni (NEXT_PUBLIC_SENTRY_DSN).
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    // Échantillonnage des traces de performance (10%) — léger
    tracesSampleRate: 0.1,
    // Pas de Session Replay (économie de bande passante / quota)
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  })
}
