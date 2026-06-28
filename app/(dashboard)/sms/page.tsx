'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import {
  Send,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Users,
  PenLine,
  ChevronDown,
} from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { cn, getSMSPartCount, formatFCFA, COUNTRY_PHONE_PREFIXES } from '@/lib/utils'

// ============================================================
// CONSTANTES
// ============================================================

const PAYS = Object.entries(COUNTRY_PHONE_PREFIXES).map(([code, { name, prefix }]) => ({
  code,
  name,
  prefix,
}))

const CHAMPS_DYNAMIQUES = ['{nom}', '{prenom}', '{telephone}']

// ============================================================
// TYPES
// ============================================================

interface Sender {
  id: string
  nom: string
  statut: string
}

interface ContactList {
  id: string
  nom: string
  _count: { contacts: number }
}

type Source = 'manuel' | 'groupe'

// ============================================================
// HELPERS
// ============================================================

function parseManualNumbers(
  input: string,
  prefix: string
): { phone: string }[] {
  return input
    .split(/[;,\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((raw) => {
      const cleaned = raw.replace(/[\s\-().]/g, '')
      let phone = cleaned
      if (!phone.startsWith('+')) {
        if (phone.startsWith('00')) phone = '+' + phone.slice(2)
        else phone = `${prefix}${phone.replace(/^0/, '')}`
      }
      return { phone }
    })
    .filter((c) => c.phone.length >= 10)
}

// ============================================================
// PAGE
// ============================================================

export default function SMSPage() {
  const { data: session, update: updateSession } = useSession()

  // ---- Données chargées ----
  const [senders, setSenders] = useState<Sender[]>([])
  const [contactLists, setContactLists] = useState<ContactList[]>([])
  const [prixSMS, setPrixSMS] = useState(30)

  // ---- Formulaire ----
  const [step, setStep] = useState<1 | 2>(1)
  const [label, setLabel] = useState('')
  const [senderNom, setSenderNom] = useState('')
  const [source, setSource] = useState<Source>('manuel')
  const [manuelInput, setManuelInput] = useState('')
  const [countryCode, setCountryCode] = useState('CI')
  const [groupId, setGroupId] = useState('')
  const [content, setContent] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // ---- Résultat ----
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ nb: number; solde: number } | null>(null)

  const soldeSMS = session?.user?.solde_sms ?? 0
  const selectedCountry = PAYS.find((p) => p.code === countryCode)
  const partCount = getSMSPartCount(content)

  // Calcul nb contacts
  const parsedContacts =
    source === 'manuel'
      ? parseManualNumbers(manuelInput, selectedCountry?.prefix ?? '+225')
      : []

  const selectedGroup = contactLists.find((l) => l.id === groupId)
  const nbContacts =
    source === 'manuel' ? parsedContacts.length : (selectedGroup?._count.contacts ?? 0)

  const coutTotal = nbContacts * partCount
  const coutFCFA = coutTotal * prixSMS
  const soldeApres = soldeSMS - coutTotal

  const charsRemaining =
    content.length <= 160
      ? 160 - content.length
      : 153 - ((content.length - 160) % 153)

  // ---- Chargement initial ----
  useEffect(() => {
    Promise.all([
      fetch('/api/senders').then((r) => r.json()),
      fetch('/api/contacts/lists').then((r) => r.json()),
      fetch('/api/config/prix').then((r) => r.json()),
    ]).then(([sendersData, listsData, prixData]) => {
      const approuves = (sendersData.senders || []).filter(
        (s: Sender) => s.statut === 'APPROVED'
      )
      setSenders(approuves)
      if (approuves.length > 0) setSenderNom(approuves[0].nom)
      setContactLists(listsData.lists || [])
      setPrixSMS(prixData.prix ?? 30)
    }).catch(() => {})
  }, [])

  // ---- Insertion champ dynamique ----
  const insertDynamic = (tag: string) => {
    setContent((prev) => prev + tag)
  }

  // ---- Validation ----
  const validate = () => {
    const errs: Record<string, string> = {}
    if (nbContacts > 1 && !label.trim()) errs.label = 'Nom requis pour un envoi multiple'
    if (!senderNom) errs.sender = 'Choisissez un expéditeur'
    if (source === 'manuel' && parsedContacts.length === 0)
      errs.contacts = 'Saisissez au moins un numéro valide'
    if (source === 'groupe' && !groupId) errs.contacts = 'Sélectionnez un groupe'
    if (!content.trim()) errs.content = 'Le message est vide'
    if (soldeSMS < coutTotal)
      errs.solde = `Solde insuffisant (${soldeSMS} SMS disponibles, ${coutTotal} requis)`
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const goToStep2 = () => {
    if (validate()) setStep(2)
  }

  // ---- Envoi ----
  const handleSubmit = async () => {
    setLoading(true)
    try {
      // SMS unique → API sms/send
      if (nbContacts === 1 && source === 'manuel') {
        const res = await fetch('/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: senderNom,
            to: parsedContacts[0].phone,
            content: content.trim(),
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error || 'Erreur lors de l\'envoi')
          setStep(1)
          return
        }
        setResult({ nb: 1, solde: data.solde_restant })
        await updateSession({ solde_sms: data.solde_restant })
        toast.success('SMS envoyé avec succès !')
      } else {
        // Envoi multiple → API campaigns
        const body: Record<string, unknown> = {
          label: label.trim() || `Envoi du ${new Date().toLocaleDateString('fr-FR')}`,
          sender: senderNom,
          content: content.trim(),
        }
        if (source === 'groupe') {
          body.group_id = groupId
        } else {
          body.contacts = parsedContacts
        }

        const res = await fetch('/api/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error || 'Erreur lors de l\'envoi')
          setStep(1)
          return
        }
        setResult({ nb: data.nb_contacts, solde: data.solde_restant })
        await updateSession({ solde_sms: data.solde_restant })
        toast.success(`${data.nb_contacts} SMS envoyés avec succès !`)
      }

      // Reset
      setLabel('')
      setManuelInput('')
      setContent('')
      setGroupId('')
      setStep(1)
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
            Envoi unitaire ou en masse vers vos contacts
          </p>
        </div>
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
            <p className="text-sm text-danger font-medium">Votre solde est épuisé</p>
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

      {/* ---- Indicateur d'étape ---- */}
      <div className="flex items-center gap-3">
        {[
          { n: 1, label: 'Configuration' },
          { n: 2, label: 'Confirmation' },
        ].map(({ n, label: lbl }, i) => (
          <div key={n} className="flex items-center gap-2">
            <div
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                step === n
                  ? 'bg-primary text-background'
                  : step > n
                  ? 'bg-secondary text-background'
                  : 'bg-border text-foreground-muted'
              )}
            >
              {step > n ? '✓' : n}
            </div>
            <span
              className={cn(
                'text-xs font-medium',
                step === n ? 'text-foreground' : 'text-foreground-muted'
              )}
            >
              {lbl}
            </span>
            {i < 1 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
      </div>

      {/* ======================================================
          ÉTAPE 1 — Configuration
          ====================================================== */}
      {step === 1 && (
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-5">

          {/* Nom de l'envoi */}
          <div>
            <label className="label">
              Nom de l&apos;envoi{' '}
              <span className="text-foreground-subtle font-normal">(optionnel pour un seul destinataire)</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Promo juillet 2026, Rappel RDV, Newsletter..."
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className={cn('input', errors.label && 'border-danger')}
            />
            {errors.label && (
              <p className="mt-1.5 text-xs text-danger">⚠ {errors.label}</p>
            )}
          </div>

          {/* Expéditeur */}
          <div>
            <label className="label">Expéditeur (Sender ID)</label>
            {senders.length > 0 ? (
              <div className="relative">
                <select
                  value={senderNom}
                  onChange={(e) => setSenderNom(e.target.value)}
                  className={cn(
                    'input appearance-none pr-9',
                    errors.sender && 'border-danger'
                  )}
                >
                  <option value="">-- Sélectionner un expéditeur --</option>
                  {senders.map((s) => (
                    <option key={s.id} value={s.nom}>
                      {s.nom}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle pointer-events-none" />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="input bg-border/30 text-foreground-subtle text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-warning shrink-0" />
                  Aucun sender validé pour le moment
                </div>
                <p className="text-xs text-foreground-subtle">
                  <Link href="/senders" className="text-primary hover:underline">
                    Créer un sender
                  </Link>{' '}
                  pour pouvoir envoyer des SMS avec votre nom d&apos;entreprise.
                </p>
              </div>
            )}
            {errors.sender && (
              <p className="mt-1.5 text-xs text-danger">⚠ {errors.sender}</p>
            )}
          </div>

          {/* Source des destinataires */}
          <div>
            <label className="label">Destinataires</label>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => { setSource('manuel'); setGroupId('') }}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all',
                  source === 'manuel'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-foreground-muted hover:border-primary/40'
                )}
              >
                <PenLine className="w-4 h-4" />
                Saisie manuelle
              </button>
              <button
                type="button"
                onClick={() => { setSource('groupe'); setManuelInput('') }}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all',
                  source === 'groupe'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-foreground-muted hover:border-primary/40'
                )}
              >
                <Users className="w-4 h-4" />
                Depuis un groupe
              </button>
            </div>

            {/* Saisie manuelle */}
            {source === 'manuel' && (
              <div className="space-y-2">
                {/* Pays par défaut */}
                <div className="flex items-center gap-2">
                  <label className="text-xs text-foreground-subtle shrink-0">Pays par défaut :</label>
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="input py-1 text-xs w-auto"
                  >
                    {PAYS.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name} ({p.prefix})
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={manuelInput}
                  onChange={(e) => setManuelInput(e.target.value)}
                  placeholder={`Ex: 0707000001; 0707000002; 0707000003\nUn numéro par ligne ou séparés par \";\"\nLes numéros locaux seront préfixés avec ${selectedCountry?.prefix}`}
                  rows={4}
                  className={cn(
                    'input resize-none font-mono text-sm',
                    errors.contacts && 'border-danger'
                  )}
                />
                {parsedContacts.length > 0 && (
                  <p className="text-xs text-secondary font-medium">
                    ✓ {parsedContacts.length} numéro{parsedContacts.length > 1 ? 's' : ''} valide{parsedContacts.length > 1 ? 's' : ''} détecté{parsedContacts.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}

            {/* Depuis un groupe */}
            {source === 'groupe' && (
              <div>
                {contactLists.length > 0 ? (
                  <div className="relative">
                    <select
                      value={groupId}
                      onChange={(e) => setGroupId(e.target.value)}
                      className={cn(
                        'input appearance-none pr-9',
                        errors.contacts && 'border-danger'
                      )}
                    >
                      <option value="">-- Sélectionner un groupe de contacts --</option>
                      {contactLists.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.nom} ({l._count.contacts} contact{l._count.contacts > 1 ? 's' : ''})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle pointer-events-none" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="input bg-border/30 text-foreground-subtle text-sm flex items-center gap-2">
                      <Users className="w-4 h-4 shrink-0" />
                      Aucun groupe de contacts créé
                    </div>
                    <p className="text-xs text-foreground-subtle">
                      <Link href="/contacts" className="text-primary hover:underline">
                        Créer un groupe
                      </Link>{' '}
                      dans la section Contacts pour importer vos listes.
                    </p>
                  </div>
                )}
                {selectedGroup && (
                  <p className="mt-2 text-xs text-secondary font-medium">
                    ✓ {selectedGroup._count.contacts} destinataire{selectedGroup._count.contacts > 1 ? 's' : ''} dans ce groupe
                  </p>
                )}
              </div>
            )}

            {errors.contacts && (
              <p className="mt-1.5 text-xs text-danger">⚠ {errors.contacts}</p>
            )}
          </div>

          {/* Message */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">Message</label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-foreground-subtle mr-1">Personnaliser :</span>
                {CHAMPS_DYNAMIQUES.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertDynamic(tag)}
                    className="text-xs bg-border text-foreground-muted hover:text-primary hover:bg-primary/10 px-1.5 py-0.5 rounded transition-colors font-mono"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Ex: Bonjour {nom}, profitez de -20% sur toute notre collection jusqu'au 31 juillet. Valable en boutique et en ligne."
                rows={5}
                maxLength={918}
                className={cn(
                  'input resize-none',
                  errors.content && 'border-danger'
                )}
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <span
                  className={cn(
                    'text-xs font-mono',
                    charsRemaining < 20 ? 'text-warning' : 'text-foreground-subtle'
                  )}
                >
                  {content.length}/{partCount <= 1 ? '160' : `${partCount * 153}`}
                </span>
                <span className="text-xs bg-border text-foreground-muted px-1.5 py-0.5 rounded font-medium">
                  {partCount} SMS{nbContacts > 1 ? '/contact' : ''}
                </span>
              </div>
            </div>
            {errors.content && (
              <p className="mt-1.5 text-xs text-danger">⚠ {errors.content}</p>
            )}
            {content.length > 160 && (
              <p className="mt-1.5 text-xs text-warning">
                Message long : découpé en {partCount} SMS ({partCount} crédit{partCount > 1 ? 's' : ''} par destinataire)
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

          <Button onClick={goToStep2} fullWidth size="lg" disabled={soldeSMS === 0}>
            Continuer →
          </Button>
        </div>
      )}

      {/* ======================================================
          ÉTAPE 2 — Confirmation
          ====================================================== */}
      {step === 2 && (
        <div className="space-y-4 animate-slide-up">
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
            <h3 className="font-syne font-semibold text-base text-foreground">
              Résumé avant envoi
            </h3>

            <div className="space-y-3">
              {label && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground-muted">Nom</span>
                  <span className="text-sm text-foreground font-medium">{label}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground-muted">Expéditeur</span>
                <span className="text-sm text-foreground font-medium">{senderNom}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground-muted">Destinataires</span>
                <span className="text-sm text-foreground font-medium">
                  {nbContacts} contact{nbContacts > 1 ? 's' : ''}
                  {source === 'groupe' && selectedGroup && ` (${selectedGroup.nom})`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground-muted">SMS par contact</span>
                <span className="text-sm text-foreground">{partCount} SMS</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground-muted">Total SMS débités</span>
                <span className="text-sm font-bold text-warning">
                  {coutTotal.toLocaleString('fr-FR')} SMS
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground-muted">Coût estimé</span>
                <span className="text-sm font-bold text-foreground">
                  {formatFCFA(coutFCFA)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="text-sm text-foreground-muted">Solde après envoi</span>
                <span
                  className={cn(
                    'text-sm font-bold',
                    soldeApres < 0 ? 'text-danger' : 'text-secondary'
                  )}
                >
                  {soldeApres.toLocaleString('fr-FR')} SMS
                </span>
              </div>
            </div>

            {/* Aperçu message */}
            <div className="bg-background border border-border rounded-xl p-4">
              <p className="text-xs text-foreground-subtle mb-2 font-medium uppercase tracking-wider">
                Aperçu du message
              </p>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {content || '(message vide)'}
              </p>
            </div>
          </div>

          {/* Alerte solde insuffisant */}
          {soldeSMS < coutTotal && (
            <div className="flex items-start gap-3 bg-danger/8 border border-danger/20 rounded-xl px-4 py-4">
              <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-danger font-semibold">Solde insuffisant</p>
                <p className="text-xs text-danger/70 mt-0.5">
                  Il vous manque {coutTotal - soldeSMS} SMS.
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

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setStep(1)}
              className="flex-1"
              size="lg"
            >
              Modifier
            </Button>
            <Button
              onClick={handleSubmit}
              loading={loading}
              disabled={soldeSMS < coutTotal}
              className="flex-1"
              size="lg"
              leftIcon={<Send className="w-4 h-4" />}
            >
              {nbContacts === 1 ? 'Envoyer le SMS' : `Envoyer à ${nbContacts} contacts`}
            </Button>
          </div>
        </div>
      )}

      {/* ---- Résultat ---- */}
      {result && (
        <div className="flex items-start gap-3 bg-secondary/8 border border-secondary/20 rounded-xl px-4 py-4 animate-slide-up">
          <CheckCircle2 className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-secondary font-semibold">
              {result.nb === 1 ? 'SMS envoyé avec succès !' : `${result.nb} SMS envoyés avec succès !`}
            </p>
            <p className="text-xs text-foreground-muted mt-1">
              Solde restant :{' '}
              <span className="font-semibold">{result.solde} SMS</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
