import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ============================================================
// TAILWIND UTILITY
// ============================================================

/** Fusionne les classes Tailwind sans conflits */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================
// FORMATAGE MONÉTAIRE
// ============================================================

/** Formate un montant en FCFA */
export function formatFCFA(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' FCFA'
}

/** Convertit un montant FCFA en nombre de SMS */
export function fcfaToSMS(montantFCFA: number, prixParSMS: number = 30): number {
  return Math.floor(montantFCFA / prixParSMS)
}

export interface PalierPrix {
  montant: number // Montant seuil minimum pour ce palier (FCFA)
  taux: number    // Taux applicable FCFA/SMS
}

/**
 * Retourne le taux FCFA/SMS applicable selon les paliers de tarification.
 * Le palier le plus élevé dont le seuil est ≤ montantFCFA est retenu.
 * Si aucun palier ne correspond (montant trop faible), retourne prixDefaut.
 */
export function getPrixFromPaliers(
  montantFCFA: number,
  paliers: PalierPrix[],
  prixDefaut: number = 30
): number {
  if (!paliers || paliers.length === 0) return prixDefaut
  const sorted = [...paliers].sort((a, b) => b.montant - a.montant)
  const palier = sorted.find((p) => montantFCFA >= p.montant)
  return palier ? palier.taux : prixDefaut
}

/** Convertit un nombre de SMS en FCFA */
export function smsToFCFA(nbSMS: number, prixParSMS: number = 30): number {
  return nbSMS * prixParSMS
}

// ============================================================
// FORMATAGE DE DATES
// ============================================================

/** Formate une date en français */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/** Formate une date courte */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

/** Retourne la date relative (il y a X minutes, etc.) */
export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) return "À l'instant"
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`
  if (diffHours < 24) return `Il y a ${diffHours}h`
  if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`
  return formatDateShort(d)
}

// ============================================================
// VALIDATION DES NUMÉROS DE TÉLÉPHONE
// ============================================================

/**
 * Préfixes téléphoniques (Côte d'Ivoire)
 */
export const COUNTRY_PHONE_PREFIXES: Record<string, { prefix: string; name: string }> = {
  CI: { prefix: '+225', name: 'Côte d\'Ivoire' },
}

/**
 * Valide et normalise un numéro de téléphone en format international
 * Retourne le numéro normalisé ou null si invalide
 */
export function normalizePhoneNumber(phone: string, countryCode?: string): string | null {
  // Supprime espaces, tirets, parenthèses
  const cleaned = phone.replace(/[\s\-().]/g, '')

  // Déjà en format international
  if (cleaned.startsWith('+')) {
    // Vérifie que le préfixe est dans la liste acceptée
    const isValid = Object.values(COUNTRY_PHONE_PREFIXES).some((c) =>
      cleaned.startsWith(c.prefix)
    )
    return isValid ? cleaned : null
  }

  // Commence par 00 → remplace par +
  if (cleaned.startsWith('00')) {
    const withPlus = '+' + cleaned.slice(2)
    return normalizePhoneNumber(withPlus)
  }

  // Numéro local → ajouter le préfixe du pays
  if (countryCode && COUNTRY_PHONE_PREFIXES[countryCode]) {
    const prefix = COUNTRY_PHONE_PREFIXES[countryCode].prefix
    // Supprime le 0 initial si présent
    const localNumber = cleaned.startsWith('0') ? cleaned.slice(1) : cleaned
    return `${prefix}${localNumber}`
  }

  return null
}

/** Vérifie qu'un numéro est en format international valide */
export function isValidInternationalPhone(phone: string): boolean {
  return normalizePhoneNumber(phone) !== null
}

// ============================================================
// VALIDATION DES SENDERS
// ============================================================

/** Vérifie qu'un sender est valide (max 11 chars, alphanumérique + espaces) */
export function isValidSenderName(name: string): boolean {
  if (name.length < 2 || name.length > 11) return false
  // Lettres, chiffres, espaces, tirets
  return /^[a-zA-Z0-9\s\-]+$/.test(name)
}

// ============================================================
// SMS UTILS
// ============================================================

/** Calcule le nombre de parties SMS en fonction du contenu */
export function getSMSPartCount(content: string): number {
  const length = content.length
  if (length === 0) return 0
  if (length <= 160) return 1
  return Math.ceil(length / 153)
}

/** Remplace les champs dynamiques dans un message de campagne */
export function interpolateMessage(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return variables[key] || match
  })
}

// ============================================================
// STATUTS
// ============================================================

/** Retourne le label français d'un statut (messages, campagnes, transactions) */
export function getMessageStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    // Message
    PENDING: 'En attente',
    SENT: 'Envoyé',
    DELIVERED: 'Délivré',
    FAILED: 'Échoué',
    // Campaign
    CREATED: 'En attente',
    PROCESSING: 'En cours',
    COMPLETED: 'Terminé',
    // Transaction / Sender
    APPROVED: 'Approuvé',
    REJECTED: 'Refusé',
    SUCCESS: 'Réussi',
    SENDING: 'En cours',
  }
  return labels[status] || status
}

/** Retourne la couleur Tailwind d'un statut */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING:    'text-warning bg-warning/10',
    CREATED:    'text-warning bg-warning/10',
    SENT:       'text-primary bg-primary/10',
    PROCESSING: 'text-primary bg-primary/10',
    SENDING:    'text-primary bg-primary/10',
    DELIVERED:  'text-secondary bg-secondary/10',
    COMPLETED:  'text-secondary bg-secondary/10',
    APPROVED:   'text-secondary bg-secondary/10',
    SUCCESS:    'text-secondary bg-secondary/10',
    FAILED:     'text-danger bg-danger/10',
    REJECTED:   'text-danger bg-danger/10',
  }
  return colors[status] || 'text-foreground-muted bg-surface'
}

// ============================================================
// TRUNCATE
// ============================================================

/** Tronque un texte à une longueur donnée */
export function truncate(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// ============================================================
// PARSING CSV/EXCEL — utilitaires côté client
// ============================================================

/** Extrait les numéros valides d'un tableau de lignes CSV */
export function extractValidContacts(
  rows: Record<string, string>[],
  phoneColumn: string = 'phone',
  countryCode?: string
): Array<{ phone: string; [key: string]: string }> {
  return rows
    .map((row) => {
      const rawPhone = row[phoneColumn] || row['telephone'] || row['numero'] || row['phone']
      if (!rawPhone) return null

      const normalizedPhone = normalizePhoneNumber(rawPhone.trim(), countryCode)
      if (!normalizedPhone) return null

      return { ...row, phone: normalizedPhone }
    })
    .filter(Boolean) as Array<{ phone: string; [key: string]: string }>
}
