// Point d'entrée d'instrumentation Next.js — charge la config Sentry
// selon le runtime (Node.js ou Edge). Activé via experimental.instrumentationHook.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}
