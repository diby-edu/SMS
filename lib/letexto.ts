/**
 * Client API LeTexto — CONFIDENTIEL
 * Ce module ne doit JAMAIS être importé côté client (composants React).
 * Toutes les fonctions doivent être appelées uniquement depuis les API Routes.
 */

import axios from 'axios'

const API_URL = process.env.LETEXTO_API_URL || 'https://apis.letexto.com/v1'
const API_KEY = process.env.LETEXTO_API_KEY

if (!API_KEY && process.env.NODE_ENV === 'production') {
  throw new Error('LETEXTO_API_KEY est manquante dans les variables d\'environnement')
}

const letextoClient = axios.create({
  baseURL: API_URL,
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 15000,
})

// ============================================================
// TYPES
// ============================================================

export interface SendSMSParams {
  from: string
  to: string
  content: string
  dlrUrl?: string
  dlrMethod?: 'GET' | 'POST'
  customData?: string
}

export interface SendSMSResponse {
  statut: string
  id: string
  partCount: number
}

export interface SMSCampaignContact {
  phone: string
  [key: string]: string // champs personnalisés : nom, prenom, etc.
}

export interface CreateCampaignParams {
  label: string
  sender: string
  contacts: SMSCampaignContact[]
  content: string
}

export interface CreateCampaignResponse {
  label: string
  sender: string
  id: number
  contactCount: number
  statut: string
  partCount: number
}

export interface CampaignStatusResponse {
  status: string
  sender: string
  id: number
  label: string
}

export interface MessageStatusResponse {
  id: string
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED'
}

export interface LeTextoBalanceResponse {
  balance: number
}

export interface LeTextoError {
  statusCode: number
  message: string | string[]
  errors: string
}

// ============================================================
// FONCTIONS
// ============================================================

/**
 * Envoi d'un SMS unitaire
 */
export async function sendSingleSMS(params: SendSMSParams): Promise<SendSMSResponse> {
  const dlrUrl = process.env.LETEXTO_DLR_URL
  const dlrMethod = process.env.LETEXTO_DLR_METHOD as 'GET' | 'POST' | undefined

  const payload = {
    from: params.from,
    to: params.to,
    content: params.content,
    ...(dlrUrl && { dlrUrl }),
    ...(dlrMethod && { dlrMethod }),
    ...(params.customData && { customData: params.customData }),
  }

  const response = await letextoClient.post<SendSMSResponse>('/messages/send', payload)
  return response.data
}

/**
 * Création d'une campagne SMS
 */
export async function createSMSCampaign(
  params: CreateCampaignParams
): Promise<CreateCampaignResponse> {
  const response = await letextoClient.post<CreateCampaignResponse>('/campaigns/sms', {
    label: params.label,
    sender: params.sender,
    contacts: params.contacts,
    content: params.content,
  })
  return response.data
}

/**
 * Statut d'une campagne SMS
 */
export async function getCampaignStatus(id: string): Promise<CampaignStatusResponse> {
  const response = await letextoClient.get<CampaignStatusResponse>(
    `/campaigns/sms/${id}/status`
  )
  return response.data
}

/**
 * Statut d'un message individuel
 */
export async function getMessageStatus(id: string): Promise<MessageStatusResponse> {
  const response = await letextoClient.get<MessageStatusResponse>(
    `/messages/${id}/status`,
    {
      params: { token: API_KEY },
    }
  )
  return response.data
}

/**
 * Solde restant sur le compte LeTexto
 * Utilisé pour les alertes admin quand le solde est bas
 */
export async function getLeTextoBalance(): Promise<number> {
  const response = await letextoClient.get<{ balance: number }>('/users/balance', {
    params: { token: API_KEY },
  })
  return response.data.balance
}

/**
 * Création d'un sender chez LeTexto
 */
export async function createLeTextoSender(name: string): Promise<unknown> {
  const response = await letextoClient.post('/senders/create', { name })
  return response.data
}

/**
 * Calcule le nombre de parties (parts) d'un SMS
 * SMS standard : 160 chars = 1 part
 * SMS long : 153 chars par part (au-delà de 160 chars)
 */
export function calculateSMSParts(content: string): number {
  const length = content.length
  if (length <= 160) return 1
  return Math.ceil(length / 153)
}
