'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import {
  Megaphone,
  Upload,
  X,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Users,
  Send,
  Info,
  CreditCard,
} from 'lucide-react'
import Link from 'next/link'
import Input from '@/components/ui/Input'
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

interface Contact {
  phone: string
  [key: string]: string
}

interface SendResult {
  campaign_id: string
  letexto_id: number
  nb_contacts: number
  solde_restant: number
}

// ============================================================
// PAGE
// ============================================================

export default function CampagnesPage() {
  const { data: session, update: updateSession } = useSession()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    label: '',
    sender: '',
    content: '',
    defaultCountry: 'CI',
  })
  const [contacts, setContacts] = useState<Contact[]>([])
  const [fileName, setFileName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SendResult | null>(null)
  const [step, setStep] = useState<1 | 2>(1)
  const [prixSMS, setPrixSMS] = useState(30)

  useEffect(() => {
    fetch('/api/config/prix')
      .then((r) => r.json())
      .then((d) => setPrixSMS(d.prix ?? 30))
      .catch(() => {})
  }, [])

  const soldeSMS = session?.user?.solde_sms ?? 0
  const partCount = getSMSPartCount(form.content)
  const coutTotal = contacts.length * partCount
  const coutFCFA = coutTotal * prixSMS
  const soldeApres = soldeSMS - coutTotal

  const handleChange =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
    }

  // ---- Insertion champ dynamique ----
  const insertDynamic = (tag: string) => {
    setForm((prev) => ({ ...prev, content: prev.content + tag }))
  }

  // ---- Parsing CSV / Excel ----
  const parseFile = useCallback(
    (file: File) => {
      setContacts([])
      setFileName(file.name)

      const ext = file.name.split('.').pop()?.toLowerCase()

      if (ext === 'csv') {
        Papa.parse<Record<string, string>>(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            processRawContacts(results.data)
          },
          error: () => {
            toast.error('Impossible de lire le fichier CSV')
          },
        })
      } else if (ext === 'xlsx' || ext === 'xls') {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer)
            const workbook = XLSX.read(data, { type: 'array' })
            const sheet = workbook.Sheets[workbook.SheetNames[0]]
            const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
              defval: '',
            })
            processRawContacts(rows)
          } catch {
            toast.error('Impossible de lire le fichier Excel')
          }
        }
        reader.readAsArrayBuffer(file)
      } else {
        toast.error('Format non supporté. Utilisez CSV ou Excel (.xlsx)')
      }
    },
    [form.defaultCountry]
  )

  const processRawContacts = (rows: Record<string, string>[]) => {
    const defaultCountry = form.defaultCountry
    const prefix =
      COUNTRY_PHONE_PREFIXES[defaultCountry as keyof typeof COUNTRY_PHONE_PREFIXES]?.prefix ||
      '+225'

    const valid: Contact[] = []
    rows.forEach((row) => {
      const rawPhone =
        row['phone'] || row['telephone'] || row['numero'] || row['Phone'] || row['Telephone']
      if (!rawPhone) return

      const cleaned = rawPhone.toString().replace(/[\s\-().]/g, '')
      let phone = cleaned

      if (!phone.startsWith('+')) {
        if (phone.startsWith('00')) {
          phone = '+' + phone.slice(2)
        } else {
          phone = `${prefix}${phone.replace(/^0/, '')}`
        }
      }

      if (phone.length < 10) return

      const contact: Contact = { phone }
      // Copier les autres colonnes comme champs personnalisés
      Object.entries(row).forEach(([k, v]) => {
        if (!['phone', 'telephone', 'numero'].includes(k.toLowerCase())) {
          contact[k.toLowerCase()] = String(v)
        }
      })
      valid.push(contact)
    })

    setContacts(valid)
    if (valid.length > 0) {
      toast.success(`${valid.length} contact${valid.length > 1 ? 's' : ''} importé${valid.length > 1 ? 's' : ''}`)
    } else {
      toast.error('Aucun numéro valide trouvé. Vérifiez la colonne "phone" ou "telephone"')
    }
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }

  const removeContacts = () => {
    setContacts([])
    setFileName('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ---- Validation étape 1 ----
  const validateStep1 = () => {
    const newErrors: Record<string, string> = {}
    if (!form.label.trim()) newErrors.label = 'Nom de campagne requis'
    if (!form.sender.trim()) newErrors.sender = 'Sender requis'
    if (form.sender.trim().length > 11) newErrors.sender = 'Max 11 caractères'
    if (!form.content.trim()) newErrors.content = 'Message vide'
    if (contacts.length === 0) newErrors.contacts = 'Importez au moins un contact'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const goToStep2 = () => {
    if (validateStep1()) setStep(2)
  }

  // ---- Envoi ----
  const handleSubmit = async () => {
    if (soldeSMS < coutTotal) {
      toast.error(`Solde insuffisant (${soldeSMS} SMS disponibles, ${coutTotal} requis)`)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: form.label.trim(),
          sender: form.sender.trim(),
          content: form.content.trim(),
          contacts,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la création de la campagne')
        setStep(1)
        return
      }

      setResult(data)
      await updateSession({ solde_sms: data.solde_restant })
      toast.success('Campagne lancée avec succès !')

      // Reset
      setForm({ label: '', sender: '', content: '', defaultCountry: 'CI' })
      setContacts([])
      setFileName('')
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
            Nouvelle campagne SMS
          </h2>
          <p className="text-sm text-foreground-muted mt-0.5">
            Envoyez un SMS à une liste de contacts
          </p>
        </div>
        <div
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shrink-0',
            soldeSMS === 0
              ? 'text-danger bg-danger/10 border-danger/20'
              : 'text-primary bg-primary/10 border-primary/20'
          )}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {soldeSMS.toLocaleString('fr-FR')} SMS
        </div>
      </div>

      {/* ---- Indicateur d'étape ---- */}
      <div className="flex items-center gap-3">
        {[
          { n: 1, label: 'Configuration' },
          { n: 2, label: 'Confirmation' },
        ].map(({ n, label }, i) => (
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
              {label}
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
          {/* Nom campagne */}
          <Input
            label="Nom de la campagne"
            type="text"
            placeholder="Ex: Promo Aout 2024"
            value={form.label}
            onChange={handleChange('label')}
            leftIcon={<Megaphone className="w-4 h-4" />}
            error={errors.label}
          />

          {/* Sender */}
          <Input
            label="Expéditeur (Sender ID)"
            type="text"
            placeholder="Ex: MonShop (max 11 car.)"
            value={form.sender}
            onChange={handleChange('sender')}
            maxLength={11}
            error={errors.sender}
            hint={`${form.sender.length}/11 caractères`}
          />

          {/* Import contacts */}
          <div>
            <label className="label">
              Contacts
              <span className="text-foreground-subtle font-normal ml-2">
                (CSV ou Excel)
              </span>
            </label>

            {contacts.length === 0 ? (
              <div>
                {/* Zone de dépôt */}
                <div
                  onDrop={handleFileDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
                    errors.contacts
                      ? 'border-danger/40 hover:border-danger/60'
                      : 'border-border hover:border-primary/40'
                  )}
                >
                  <Upload className="w-8 h-8 text-foreground-subtle mx-auto mb-3" />
                  <p className="text-sm text-foreground-muted font-medium">
                    Glissez votre fichier ici ou{' '}
                    <span className="text-primary">cliquez pour sélectionner</span>
                  </p>
                  <p className="text-xs text-foreground-subtle mt-1">
                    CSV ou Excel · Colonne requise : <code className="bg-border px-1 rounded">phone</code>
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileSelect}
                />

                {/* Sélecteur pays par défaut */}
                <div className="flex items-center gap-2 mt-3">
                  <Info className="w-4 h-4 text-foreground-subtle shrink-0" />
                  <label className="text-xs text-foreground-subtle">
                    Pays par défaut pour les numéros locaux :
                  </label>
                  <select
                    value={form.defaultCountry}
                    onChange={handleChange('defaultCountry')}
                    className="input py-1 text-xs w-auto"
                  >
                    {PAYS.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name} ({p.prefix})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              /* Aperçu contacts importés */
              <div className="bg-secondary/5 border border-secondary/20 rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-secondary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{fileName}</p>
                    <p className="text-xs text-foreground-muted">
                      {contacts.length} contact{contacts.length > 1 ? 's' : ''} valide{contacts.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={removeContacts}
                  className="text-foreground-subtle hover:text-danger transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
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
              {/* Champs dynamiques */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-foreground-subtle mr-1">
                  Personnaliser :
                </span>
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
                value={form.content}
                onChange={handleChange('content')}
                placeholder="Bonjour {prenom}, votre offre exclusive..."
                rows={5}
                maxLength={918}
                className={cn(
                  'input resize-none',
                  errors.content && 'border-danger focus:border-danger focus:ring-danger/30'
                )}
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <span className="text-xs text-foreground-subtle font-mono">
                  {form.content.length}
                </span>
                <span className="text-xs bg-border text-foreground-muted px-1.5 py-0.5 rounded font-medium">
                  {partCount} SMS/contact
                </span>
              </div>
            </div>
            {errors.content && (
              <p className="mt-1.5 text-xs text-danger">⚠ {errors.content}</p>
            )}
          </div>

          <Button onClick={goToStep2} fullWidth size="lg">
            Continuer
          </Button>
        </div>
      )}

      {/* ======================================================
          ÉTAPE 2 — Confirmation
          ====================================================== */}
      {step === 2 && (
        <div className="space-y-4 animate-slide-up">
          {/* Résumé */}
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
            <h3 className="font-syne font-semibold text-base text-foreground">
              Résumé de la campagne
            </h3>

            <div className="space-y-3">
              {[
                { label: 'Nom', value: form.label },
                { label: 'Expéditeur', value: form.sender },
                {
                  label: 'Contacts',
                  value: `${contacts.length} destinataire${contacts.length > 1 ? 's' : ''}`,
                },
                { label: 'SMS par contact', value: `${partCount} SMS` },
                {
                  label: 'Total SMS débités',
                  value: (
                    <span className="text-warning font-bold">
                      {coutTotal.toLocaleString('fr-FR')} SMS
                    </span>
                  ),
                },
                {
                  label: 'Coût estimé',
                  value: (
                    <span className="text-foreground font-bold">
                      {formatFCFA(coutFCFA)}
                    </span>
                  ),
                },
                {
                  label: 'Solde après envoi',
                  value: (
                    <span
                      className={
                        soldeApres < 0 ? 'text-danger font-bold' : 'text-secondary font-bold'
                      }
                    >
                      {soldeApres.toLocaleString('fr-FR')} SMS
                    </span>
                  ),
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-foreground-muted">{label}</span>
                  <span className="text-sm text-foreground">{value}</span>
                </div>
              ))}
            </div>

            {/* Aperçu message */}
            <div className="bg-background border border-border rounded-xl p-4">
              <p className="text-xs text-foreground-subtle mb-2 font-medium uppercase tracking-wider">
                Aperçu du message
              </p>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {form.content || '(message vide)'}
              </p>
            </div>
          </div>

          {/* Alerte solde insuffisant */}
          {soldeSMS < coutTotal && (
            <div className="flex items-start gap-3 bg-danger/8 border border-danger/20 rounded-xl px-4 py-4">
              <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-danger font-semibold">
                  Solde insuffisant
                </p>
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

          {/* Boutons */}
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
              Lancer la campagne
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
              Campagne lancée avec succès !
            </p>
            <p className="text-xs text-foreground-muted mt-1">
              {result.nb_contacts} SMS envoyés · Solde restant :{' '}
              <span className="font-semibold">{result.solde_restant} SMS</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
