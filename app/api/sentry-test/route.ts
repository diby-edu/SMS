import * as Sentry from '@sentry/nextjs'

/**
 * ROUTE TEMPORAIRE DE TEST SENTRY — à supprimer après vérification.
 * GET /api/sentry-test → génère une erreur volontaire qui remonte dans Sentry.
 */
export async function GET() {
  const err = new Error(
    'TextoPro — test Sentry depuis /api/sentry-test (erreur volontaire, ' +
      new Date().toISOString() +
      ')'
  )
  Sentry.captureException(err)
  await Sentry.flush(3000)
  throw err
}
