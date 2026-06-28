'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  CreditCard,
  MessageSquare,
  ArrowRight,
  History,
  CheckCircle2,
  Loader2,
  Smartphone,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import { cn, formatFCFA, fcfaToSMS, formatDate, getStatusColor } from '@/lib/utils'

// ============================================================
// CONSTANTES
// ============================================================

const METHODES_PAIEMENT = [
  { label: 'Orange Money CI', icon: '🟠' },
  { label: 'MTN MoMo CI', icon: '🟡' },
  { label: 'Wave CI', icon: '🔵' },
  { label: 'Moov Money CI', icon: '🟣' },
  { label: 'Free Money', icon: '🔴' },
  { label: 'Orange Money SN/ML', icon: '🟠' },
]

interface Transaction {
  id: string
  montant_fcfa: number
  sms_credites: number
  statut: string
  type?: string
  note?: string | null
  created_at: string
}

// ============================================================
// PAGE
// ============================================================

export default function RechargePage() {
  const { data: session } = useSession()
  const router = useRouter()

  const [montant, setMontant] = useState<number | ''>('')
  const [loading, setLoading] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [prixSMS, setPrixSMS] = useState(30)
  const [montantMinimum, setMontantMinimum] = useState(500)
  const [montantsRapides, setMontantsRapides] = useState<number[]>([1000, 3000, 5000, 10000, 25000, 50000])

  const soldeSMS = session?.user?.solde_sms ?? 0
  const smsObtenus = montant ? fcfaToSMS(Number(montant), prixSMS) : 0

  const loadData = useCallback(async () => {
    const [rechargeRes, prixRes] = await Promise.all([
      fetch('/api/recharge'),
      fetch('/api/config/prix'),
    ])
    if (rechargeRes.ok) {
      const d = await rechargeRes.json()
      setTransactions(d.transactions || [])
    }
    if (prixRes.ok) {
      const p = await prixRes.json()
      setPrixSMS(p.prix ?? 30)
      setMontantMinimum(p.montant_minimum ?? 500)
      if (Array.isArray(p.montants_rapides) && p.montants_rapides.length > 0) {
        setMontantsRapides(p.montants_rapides)
      }
    }
    setLoadingHistory(false)
  }, [])

  // ---- Charger l'historique + prix ----
  useEffect(() => { loadData() }, [loadData])

  const handleMontantRapide = (fcfa: number) => {
    setMontant(fcfa)
  }

  const handlePayer = async () => {
    if (!montant || Number(montant) < montantMinimum) {
      toast.error(`Montant minimum : ${montantMinimum.toLocaleString('fr-FR')} FCFA`)
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ montantFCFA: Number(montant) }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la création de la facture')
        return
      }

      // Ouvrir la page de paiement PayDunya dans un nouvel onglet
      window.open(data.invoice_url, '_blank')
    } catch {
      toast.error('Erreur réseau. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  const statusLabel: Record<string, string> = {
    PENDING: 'En attente',
    SUCCESS: 'Confirmé',
    FAILED: 'Échoué',
  }

  // ============================================================
  // RENDU
  // ============================================================

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* ---- En-tête ---- */}
      <div>
        <h2 className="font-syne font-bold text-xl text-foreground">
          Recharger les crédits SMS
        </h2>
        <p className="text-sm text-foreground-muted mt-0.5">
          Paiement sécurisé via Orange Money, MTN, Wave et plus
        </p>
      </div>

      {/* ---- Solde actuel ---- */}
      <div
        className="rounded-2xl p-5 flex items-center justify-between gap-4"
        style={{
          background: 'linear-gradient(135deg, rgba(0,212,255,0.08) 0%, rgba(16,185,129,0.08) 100%)',
          border: '1px solid rgba(0,212,255,0.15)',
        }}
      >
        <div>
          <p className="text-xs text-foreground-muted font-medium uppercase tracking-wider">
            Votre solde actuel
          </p>
          <p className="font-syne font-bold text-3xl text-foreground mt-1">
            {soldeSMS.toLocaleString('fr-FR')}{' '}
            <span className="text-lg font-medium text-foreground-muted">SMS</span>
          </p>
        </div>
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <MessageSquare className="w-7 h-7 text-primary" />
        </div>
      </div>

      {/* ---- Formulaire de recharge ---- */}
      <div className="bg-surface border border-border rounded-2xl p-6 space-y-5">
        {/* Montants rapides */}
        <div>
          <label className="label">Montant</label>
          <div className="grid grid-cols-3 gap-2">
            {montantsRapides.map((fcfa) => (
              <button
                key={fcfa}
                onClick={() => handleMontantRapide(fcfa)}
                className={cn(
                  'px-3 py-2.5 rounded-lg border text-xs font-semibold transition-all duration-150',
                  montant === fcfa
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-foreground-muted hover:border-primary/40 hover:text-foreground'
                )}
              >
                <span className="block">{fcfa.toLocaleString('fr-FR')} FCFA</span>
                <span
                  className={cn(
                    'block mt-0.5 font-normal',
                    montant === fcfa ? 'text-primary/70' : 'text-foreground-subtle'
                  )}
                >
                  {fcfaToSMS(fcfa, prixSMS)} SMS
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Champ montant personnalisé */}
        <div>
          <label className="label">Ou saisir un montant personnalisé (FCFA)</label>
          <div className="relative">
            <input
              type="number"
              min={montantMinimum}
              max={500000}
              step={100}
              placeholder="Ex: 7500"
              value={montant}
              onChange={(e) =>
                setMontant(e.target.value ? Number(e.target.value) : '')
              }
              className="input pr-16"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground-subtle font-medium">
              FCFA
            </span>
          </div>
        </div>

        {/* Résumé */}
        {montant && smsObtenus > 0 && (
          <div className="bg-background border border-border rounded-xl p-4 space-y-2.5 animate-slide-up">
            <div className="flex justify-between items-center">
              <span className="text-sm text-foreground-muted">Montant</span>
              <span className="text-sm font-semibold text-foreground">
                {formatFCFA(Number(montant))}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-foreground-muted">SMS crédités</span>
              <span className="text-sm font-bold text-primary">
                +{smsObtenus.toLocaleString('fr-FR')} SMS
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-foreground-muted">Prix unitaire</span>
              <span className="text-sm text-foreground-muted">
                {prixSMS} FCFA / SMS
              </span>
            </div>
            <div className="border-t border-border pt-2.5 flex justify-between items-center">
              <span className="text-sm text-foreground-muted">Solde après recharge</span>
              <span className="text-sm font-bold text-secondary">
                {(soldeSMS + smsObtenus).toLocaleString('fr-FR')} SMS
              </span>
            </div>
          </div>
        )}

        {/* Méthodes de paiement */}
        <div>
          <p className="text-xs text-foreground-subtle font-medium mb-2">
            Méthodes de paiement acceptées :
          </p>
          <div className="flex flex-wrap gap-2">
            {METHODES_PAIEMENT.map(({ label, icon }) => (
              <span
                key={label}
                className="flex items-center gap-1 bg-border text-foreground-muted text-xs px-2.5 py-1 rounded-lg"
              >
                <span>{icon}</span>
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Bouton payer */}
        <Button
          onClick={handlePayer}
          loading={loading}
          disabled={!montant || Number(montant) < montantMinimum}
          fullWidth
          size="lg"
          leftIcon={<CreditCard className="w-4 h-4" />}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          {loading
            ? 'Redirection...'
            : montant
            ? `Payer ${formatFCFA(Number(montant))}`
            : 'Sélectionnez un montant'}
        </Button>

        <p className="text-xs text-foreground-subtle text-center">
          Vous serez redirigé vers la page de paiement sécurisée PayDunya.
          Les crédits sont ajoutés automatiquement après confirmation.
        </p>
      </div>

      {/* ---- Historique des recharges ---- */}
      <div className="bg-surface border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-foreground-subtle" />
          <h3 className="font-syne font-semibold text-sm text-foreground">
            Historique des recharges
          </h3>
        </div>

        {loadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-foreground-subtle text-center py-6">
            Aucune recharge effectuée
          </p>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {tx.type === 'MANUELLE' ? '0 FCFA' : formatFCFA(tx.montant_fcfa)}
                  </p>
                  {tx.type === 'MANUELLE' && (
                    <p className="text-xs text-secondary font-medium">Crédit manuel</p>
                  )}
                  <p className="text-xs text-foreground-subtle mt-0.5">
                    {formatDate(tx.created_at)}
                    {tx.note && ` · ${tx.note}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-primary font-semibold">
                    +{tx.sms_credites.toLocaleString('fr-FR')} SMS
                  </span>
                  <span
                    className={cn(
                      'badge',
                      getStatusColor(tx.statut)
                    )}
                  >
                    {statusLabel[tx.statut] || tx.statut}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
