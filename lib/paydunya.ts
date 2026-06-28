/**
 * Client API PayDunya
 * Gestion des paiements mobiles : Orange Money, MTN, Wave, Moov, Free Money
 * Documentation : https://paydunya.com/developers
 * Note: l'URL de paiement est retournée dans response_text (domaine payment.paydunya.com)
 */

import axios from 'axios'

// URLs de l'API PayDunya selon le mode
const API_BASE = {
  test: 'https://app.paydunya.com/sandbox-api/v1',
  live: 'https://app.paydunya.com/api/v1',
}

const mode = (process.env.PAYDUNYA_MODE as 'test' | 'live') || 'test'
const API_URL = API_BASE[mode]

// Headers d'authentification PayDunya
const paydunyaHeaders = {
  'PAYDUNYA-MASTER-KEY': process.env.PAYDUNYA_MASTER_KEY || '',
  'PAYDUNYA-PRIVATE-KEY': process.env.PAYDUNYA_PRIVATE_KEY || '',
  'PAYDUNYA-TOKEN': process.env.PAYDUNYA_TOKEN || '',
  'Content-Type': 'application/json',
}

const paydunyaClient = axios.create({
  baseURL: API_URL,
  headers: paydunyaHeaders,
  timeout: 20000,
})

// ============================================================
// TYPES
// ============================================================

export interface CreateInvoiceParams {
  montantFCFA: number
  smsCredites: number
  userId: string
  userEmail: string
  userName: string
}

export interface PayDunyaInvoiceResponse {
  response_code: string
  response_text: string
  description: string
  token: string
  invoice_url: string
}

export interface PayDunyaConfirmResponse {
  response_code: string
  response_text: string
  status: string // "completed" | "pending" | "cancelled"
  invoice: {
    token: string
    total_amount: number
    description: string
  }
  custom_data?: {
    user_id: string
    sms_credites: number
  }
}

// ============================================================
// FONCTIONS
// ============================================================

/**
 * Crée une facture de paiement PayDunya
 * Retourne l'URL de la page de paiement vers laquelle rediriger le client
 */
export async function createPayDunyaInvoice(
  params: CreateInvoiceParams
): Promise<PayDunyaInvoiceResponse> {
  const payload = {
    invoice: {
      items: {
        item_0: {
          name: 'Recharge SMS TextoPro',
          quantity: 1,
          unit_price: params.montantFCFA,
          total_price: params.montantFCFA,
          description: `${params.smsCredites} SMS crédités sur votre compte`,
        },
      },
      taxes: {},
      total_amount: params.montantFCFA,
      description: `Recharge TextoPro — ${params.smsCredites} SMS`,
    },
    store: {
      name: process.env.PAYDUNYA_STORE_NAME || 'TextoPro',
      tagline: process.env.PAYDUNYA_STORE_TAGLINE || 'Plateforme SMS Marketing',
      phone: process.env.PAYDUNYA_STORE_PHONE || '',
      postal_address: process.env.PAYDUNYA_STORE_POSTAL_ADDRESS || 'Abidjan, Côte d\'Ivoire',
      website_url: process.env.PAYDUNYA_STORE_WEBSITE_URL || '',
    },
    actions: {
      cancel_url: process.env.PAYDUNYA_CANCEL_URL || '',
      return_url: process.env.PAYDUNYA_RETURN_URL || '',
      callback_url: process.env.PAYDUNYA_NOTIFY_URL || '',
    },
    // Données personnalisées récupérées dans le webhook IPN
    custom_data: {
      user_id: params.userId,
      sms_credites: params.smsCredites,
      montant_fcfa: params.montantFCFA,
    },
  }

  // Log de diagnostic (visible dans pm2 logs)
  console.log('[PayDunya] Mode:', mode)
  console.log('[PayDunya] API URL:', API_URL)
  console.log('[PayDunya] MASTER_KEY prefix:', (process.env.PAYDUNYA_MASTER_KEY || '').slice(0, 8) + '...')

  const response = await paydunyaClient.post<PayDunyaInvoiceResponse>(
    '/checkout-invoice/create',
    payload
  )

  console.log('[PayDunya] Response:', JSON.stringify(response.data))

  if (response.data.response_code !== '00') {
    throw new Error(`PayDunya error: ${response.data.response_text}`)
  }

  // PayDunya retourne l'URL de paiement dans response_text (nouveau format payment.paydunya.com)
  // Si invoice_url est absent, on utilise response_text s'il contient une URL
  if (!response.data.invoice_url) {
    if (response.data.response_text?.startsWith('http')) {
      response.data.invoice_url = response.data.response_text
      console.log('[PayDunya] invoice_url extrait de response_text:', response.data.invoice_url)
    } else {
      console.log('[PayDunya] invoice_url absent et response_text non-URL:', response.data.response_text)
    }
  } else {
    console.log('[PayDunya] invoice_url retourné par PayDunya:', response.data.invoice_url)
  }

  return response.data
}

/**
 * Vérifie et confirme une transaction PayDunya par son token
 * À appeler TOUJOURS côté serveur avant de créditer un client
 */
export async function confirmPayDunyaTransaction(
  token: string
): Promise<PayDunyaConfirmResponse> {
  const response = await paydunyaClient.get<PayDunyaConfirmResponse>(
    `/checkout-invoice/confirm/${token}`
  )
  return response.data
}

/**
 * Vérifie qu'un paiement est bien complété
 */
export function isPaymentCompleted(confirmation: PayDunyaConfirmResponse): boolean {
  return (
    confirmation.response_code === '00' && confirmation.status === 'completed'
  )
}
