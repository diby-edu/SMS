'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Send,
  MessageSquare,
  User,
  Phone,
  AlertCircle,
  CheckCircle2,
  CreditCard,
} from 'lucide-react'
import Link from 'next/link'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { cn, getSMSPartCount, COUNTRY_PHONE_PREFIXES } from '@/lib/utils'

// ============================================================
// PAYS
// ============================================================

const PAYS = Object.entries(COUNTRY_PHONE_PREFIXES).map(([code, { name, prefix }]) => ({
  code,
  name,
  prefix,
}))

// ============================================================
// TYPES
// ============================================================

interface Sender {
  id: string
  nom: string
  statut: string
}

interface SendResult {
  message_id: string
  letexto_id: string
  parts: number
  solde_restant: number
}

// ============================================================
// PAGE
// ============================================================

export default function SMSPage() {
  const { data: session, update: updateSession } = useSession()
  const router = useRouter()

  const [senders, setSenders] = useState<Sender[]>([])
  const [form, setForm] = useState({
    from: '',
    countryCode: 'CI',
    to: '',
    content: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SendResult | null>(null)

  const soldeSMS = session?.user?.solde_sms ?? 0
  const partCount = getSMSPartCount(form.content)
  const charsRemaining =
    form.content.length <= 160
      ? 160 - form.content.length
      : 153 - ((form.content.length - 160) % 153)

  const selectedCountry = PAYS.find((p) => p.code === form.countryCode)

  // ---- Charger les senders approuvés ----
  useEffect(() => {
    fetch('/api/senders')
      .then((r) => r.json())
      .then((d) => {
        setSenders(d.senders || [])
        // Pré-sélectionner le premier sender
        if (d.senders?.length > 0 && !form.from) {
          setForm((prev) => ({ ...prev, from: d.senders[0].nom }))
        }
      })
      .catch(() => {})
  }, [])

  const handleChange =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
    }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!form.from.trim()) newErrors.from = 'Choisissez un expéditeur'
    if (form.from.trim().length > 11) newErrors.from = 'Max 11 caractères'
    if (!form.to.trim()) newErrors.to = 'Numéro requis'
    if (!form.content.trim()) newErrors.content = 'Message vide'
    if (soldeSMS < partCount)
      newErrors.solde = `Solde insuffisant (${soldeSMS} SMS disponibles, ${partCount} requis)`
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setResult(null)

    // Construire le numéro complet
    const rawPhone = form.to.trim()
    const fullPhone = rawPhone.startsWith('+')
      ? rawPhone
      : `${selectedCountry?.prefix}${rawPhone.replace(/^0/, '')}`

    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: form.from.trim(),
          to: fullPhone,
          content: form.content.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.errors) {
          const fieldErrors: Record<string, string> = {}
          Object.entries(data.errors).forEach(([k, v]) => {
            fieldErrors[k] = Array.isArray(v) ? v[0] : String(v)
          })
          setErrors(fieldErrors)
        } else {
          toast.error(data.error || 'Erreur lors de l\'envoi')
        }
        return
      }

      setResult(data)
      toast.success('SMS envoyé avec succès !')

      // Mettre à jour le solde dans la session
      await updateSession({ solde_sms: data.solde_restant })

      // Reset le formulaire (garder le sender et le pays)
      setForm((prev) => ({ ...prev, to: '', content: '' }))
    } catch {
      toast.error('Erreur réseau. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  // ============================================================
  // RENDU
  // ============================================================

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* ---- En-tête ---- */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-syne font-bold text-xl text-foreground">
            Envoyer un SMS
          </h2>
          <p className="text-sm text-foreground-muted mt-0.5">
            Envoi individuel vers un numéro
          </p>
        </div>

        {/* Badge solde */}
        <div
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shrink-0',
            soldeSMS === 0
              ? 'text-danger bg-danger/10 border-danger/20'
              : soldeSMS < 20
              ? 'text-warning bg-warning/10 border-warning/20'
              : 'text-primary bg-primary/10 border-primary/20'
          )}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {soldeSMS.toLocaleString('fr-FR')} SMS disponibles
        </div>
      </div>

      {/* ---- Alerte solde vide ---- */}
      {soldeSMS === 0 && (
        <div className="flex items-start gap-3 bg-danger/8 border border-danger/20 rounded-xl px-4 py-4">
          <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-danger font-medium">
              Votre solde est épuisé
            </p>
            <p className="text-xs text-danger/70 mt-0.5">
              Rechargez vos crédits pour pouvoir envoyer des SMS.
            </p>
            <Link
              href="/recharge"
              className="inline-flex items-center gap-1.5 mt-2 text-xs text-danger font-semibold hover:text-danger/80 transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Recharger maintenant
            </Link>
          </div>
        </div>
      )}

      {/* ---- Formulaire ---- */}
      <div className="bg-surface border border-border rounded-2xl p-6 space-y-5">
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Expéditeur */}
          <div>
            <label className="label">Expéditeur (Sender ID)</label>
            {senders.length > 0 ? (
              <select
                value={form.from}
                onChange={handleChange('from')}
                className={cn(
                  'input',
                  errors.from && 'border-danger focus:border-danger focus:ring-danger/30'
                )}
              >
                <option value="">Sélectionner un sender</option>
                {senders.map((s) => (
                  <option key={s.id} value={s.nom}>
                    {s.nom}
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Ex: MonApp (max 11 caractères)"
                  value={form.from}
                  onChange={handleChange('from')}
                  leftIcon={<User className="w-4 h-4" />}
                  error={errors.from}
                  maxLength={11}
                />
                <p className="text-xs text-foreground-subtle">
                  Vous n&apos;avez pas encore de sender validé.{' '}
                  <Link href="/senders" className="text-primary hover:underline">
                    Créer un sender
                  </Link>
                </p>
              </div>
            )}
            {errors.from && senders.length > 0 && (
              <p className="mt-1.5 text-xs text-danger">⚠ {errors.from}</p>
            )}
          </div>

          {/* Destinataire */}
          <div>
            <label className="label">Numéro destinataire</label>
            <div className="flex gap-2">
              {/* Sélecteur pays */}
              <div className="relative shrink-0">
                <select
                  value={form.countryCode}
                  onChange={handleChange('countryCode')}
                  className="input pr-7 pl-3 appearance-none cursor-pointer w-[110px] text-xs"
                  aria-label="Pays"
                >
                  {PAYS.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.prefix}
                    </option>
                  ))}
                </select>
              </div>
              {/* Numéro */}
              <Input
                type="tel"
                placeholder="07 00 00 00 00"
                value={form.to}
                onChange={handleChange('to')}
                leftIcon={<Phone className="w-4 h-4" />}
                error={errors.to}
                className="flex-1"
              />
            </div>
            <p className="mt-1.5 text-xs text-foreground-subtle">
              Préfixe : {selectedCountry?.prefix} — {selectedCountry?.name}
            </p>
          </div>

          {/* Message */}
          <div>
            <label className="label">Message</label>
            <div className="relative">
              <textarea
                value={form.content}
                onChange={handleChange('content')}
                placeholder="Tapez votre message ici..."
                rows={5}
                maxLength={918}
                className={cn(
                  'input resize-none',
                  errors.content && 'border-danger focus:border-danger focus:ring-danger/30'
                )}
              />
              {/* Compteur de caractères */}
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <span
                  className={cn(
                    'text-xs font-mono',
                    charsRemaining < 20 ? 'text-warning' : 'text-foreground-subtle'
                  )}
                >
                  {form.content.length}/
                  {partCount <= 1 ? '160' : `${partCount * 153}`}
                </span>
                <span className="text-xs bg-border text-foreground-muted px-1.5 py-0.5 rounded font-medium">
                  {partCount} SMS
                </span>
              </div>
            </div>
            {errors.content && (
              <p className="mt-1.5 text-xs text-danger">⚠ {errors.content}</p>
            )}
            {form.content.length > 160 && (
              <p className="mt-1.5 text-xs text-warning">
                Message long : découpé en {partCount} SMS ({partCount} crédit
                {partCount > 1 ? 's' : ''} débité{partCount > 1 ? 's' : ''})
              </p>
            )}
          </div>

          {/* Erreur solde */}
          {errors.solde && (
            <div className="flex items-start gap-2.5 bg-danger/8 border border-danger/20 rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
              <p className="text-sm text-danger">{errors.solde}</p>
            </div>
          )}

          {/* Résumé avant envoi */}
          {form.from && form.to && form.content && !errors.solde && (
            <div className="bg-primary/5 border border-primary/15 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
              <p className="text-xs text-foreground-muted">
                <span className="text-foreground font-medium">{partCount} SMS</span> seront
                débités de votre solde
              </p>
              <p className="text-xs text-foreground-muted shrink-0">
                Solde après :{' '}
                <span className="text-foreground font-medium">
                  {soldeSMS - partCount} SMS
                </span>
              </p>
            </div>
          )}

          {/* Bouton envoi */}
          <Button
            type="submit"
            loading={loading}
            disabled={soldeSMS === 0}
            fullWidth
            size="lg"
            leftIcon={<Send className="w-4 h-4" />}
          >
            Envoyer le SMS
          </Button>
        </form>
      </div>

      {/* ---- Résultat après envoi ---- */}
      {result && (
        <div className="flex items-start gap-3 bg-secondary/8 border border-secondary/20 rounded-xl px-4 py-4 animate-slide-up">
          <CheckCircle2 className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-secondary font-semibold">
              SMS envoyé avec succès !
            </p>
            <p className="text-xs text-foreground-muted mt-1">
              ID message : <span className="font-mono">{result.letexto_id}</span>
              {' · '}
              Solde restant :{' '}
              <span className="font-semibold">{result.solde_restant} SMS</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
