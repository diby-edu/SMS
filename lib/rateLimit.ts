/**
 * Rate limiter en mémoire (fenêtre fixe).
 * Adapté à un déploiement mono-instance (PM2 "textopro", 1 process).
 * Pour un scaling multi-instances, remplacer par un store partagé (Redis/Upstash).
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

type Bucket = { count: number; reset: number }

const store = new Map<string, Bucket>()

// Nettoyage périodique des buckets expirés (évite la fuite mémoire)
let lastSweep = Date.now()
function sweep(now: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  // forEach évite l'itération directe du Map (compat cible TS du projet)
  store.forEach((b, key) => {
    if (b.reset <= now) store.delete(key)
  })
}

export interface RateResult {
  allowed: boolean
  remaining: number
  retryAfterSec: number
}

/**
 * Autorise `limit` requêtes par fenêtre de `windowMs` pour une clé donnée.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now()
  sweep(now)

  const bucket = store.get(key)
  if (!bucket || bucket.reset <= now) {
    store.set(key, { count: 1, reset: now + windowMs })
    return { allowed: true, remaining: limit - 1, retryAfterSec: 0 }
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((bucket.reset - now) / 1000)),
    }
  }

  bucket.count += 1
  return { allowed: true, remaining: limit - bucket.count, retryAfterSec: 0 }
}

/** Extrait l'IP client en tenant compte du reverse proxy nginx. */
export function getClientIp(req: NextRequest | Request): string {
  const h = req.headers
  const xff = h.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return h.get('x-real-ip') || 'unknown'
}

/** Réponse standard 429 avec en-tête Retry-After. */
export function tooManyRequests(retryAfterSec: number, message?: string): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message || 'Trop de requêtes. Réessayez plus tard.',
      message: message || 'Trop de requêtes. Réessayez plus tard.',
    },
    { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
  )
}
