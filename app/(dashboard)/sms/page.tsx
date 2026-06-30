'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import {
  Send,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Users,
  PenLine,
  ChevronDown,
  BookMarked,
  Calendar,
  Save,
  FolderOpen,
  X,
  Upload,
  FileSpreadsheet,
} from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { cn, getSMSPartCount, formatFCFA } from '@/lib/utils'

// ============================================================
// TYPES
// ============================================================

interface Sender {
  id: string
  nom: string
  statut: string
  type_message?: string | null
}

interface ImportStats {
  total: number
  valid: number
  invalid: number
  duplicates: number
}

interface ContactList {
  id: string
  nom: string
  _count: { contacts: number }
}

interface MessageTemplate {
  name: string
  content: string
}

interface Contact {
  phone: string
  [key: string]: string
}

type Source = 'manuel' | 'groupe' | 'fichier'

const TEMPLATES_KEY = 'textopro_sms_templates'
const CHAMPS_DYNAMIQUES = ['{nom}', '{prenom}', '{telephone}']

// ============================================================
// HELPERS
// ============================================================


function loadTemplates(): MessageTemplate[] {
  try {
    return JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]')
  } catch {
    return []
  }
}

function saveTemplates(templates: MessageTemplate[]) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates))
}

// ============================================================
// PAGE
// ============================================================

export default function SMSPage() {
  const { data: session, update: updateSession } = useSession()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ---- Données chargées ----
  const [senders, setSenders] = useState<Sender[]>([])
  const [contactLists, setContactLists] = useState<ContactList[]>([])
  const [prixSMS, setPrixSMS] = useState(30)

  // ---- Formulaire ----
  const [step, setStep] = useState<1 | 2>(1)
  const [label, setLabel] = useState('')
  const [senderNom, setSenderNom] = useState('')
  const [source, setSource] = useState<Source>('manuel')
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>([])
  const [phoneInputValue, setPhoneInputValue] = useState('')
  const [groupId, setGroupId] = useState('')
  const [fichierContacts, setFichierContacts] = useState<Contact[]>([])
  const [fichierNom, setFichierNom] = useState('')
  const [importStats, setImportStats] = useState<ImportStats | null>(null)
  const [content, setContent] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // ---- Templates ----
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [showTemplateSave, setShowTemplateSave] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [showTemplateLoad, setShowTemplateLoad] = useState(false)

  // ---- Résultat ----
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ nb: number; solde: number } | null>(null)

  const soldeSMS = session?.user?.solde_sms ?? 0
  const partCount = getSMSPartCount(content)

  const parsedContacts = source === 'manuel' ? phoneNumbers.map((phone) => ({ phone })) : []
  const selectedGroup = contactLists.find((l) => l.id === groupId)
  const nbContacts =
    source === 'manuel'
      ? parsedContacts.length
      : source === 'groupe'
      ? (selectedGroup?._count.contacts ?? 0)
      : fichierContacts.length

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

    setTemplates(loadTemplates())
  }, [])

  // ---- Tag input numéros ----
  const addPhoneTag = (raw: string) => {
    const cleaned = raw.trim().replace(/[\s\-().]/g, '')
    if (!cleaned) return
    let phone = cleaned
    if (!phone.startsWith('+')) {
      if (phone.startsWith('00')) phone = '+' + phone.slice(2)
    }
    if (phone.startsWith('+') && phone.length >= 10 && !phoneNumbers.includes(phone)) {
      setPhoneNumbers((prev) => [...prev, phone])
    }
    setPhoneInputValue('')
  }

  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ';') {
      e.preventDefault()
      addPhoneTag(phoneInputValue.replace(/;$/, ''))
    } else if (e.key === 'Backspace' && !phoneInputValue && phoneNumbers.length > 0) {
      setPhoneNumbers((prev) => prev.slice(0, -1))
    }
  }

  const removePhoneTag = (index: number) => {
    setPhoneNumbers((prev) => prev.filter((_, i) => i !== index))
  }

  // ---- Templates ----
  const handleSaveTemplate = () => {
    if (!content.trim()) { toast.error('Le message est vide'); return }
    if (!templateName.trim()) { toast.error('Donnez un nom au modèle'); return }
    const existing = templates.filter((t) => t.name !== templateName.trim())
    const updated = [...existing, { name: templateName.trim(), content: content.trim() }]
    saveTemplates(updated)
    setTemplates(updated)
    setShowTemplateSave(false)
    setTemplateName('')
    toast.success('Modèle enregistré')
  }

  const handleLoadTemplate = (t: MessageTemplate) => {
    setContent(t.content)
    setShowTemplateLoad(false)
    toast.success(`Modèle "${t.name}" chargé`)
  }

  const handleDeleteTemplate = (name: string) => {
    const updated = templates.filter((t) => t.name !== name)
    saveTemplates(updated)
    setTemplates(updated)
  }

  const insertDynamic = (tag: string) => {
    setContent((prev) => prev + tag)
  }

  // ---- Import CSV/XLSX ----
  const processRawContacts = useCallback((rows: Record<string, string>[]) => {
    const valid: Contact[] = []
    let invalidCount = 0
    let duplicateCount = 0
    const seen = new Set<string>()

    rows.forEach((row) => {
      const rawPhone = row['phone'] || row['telephone'] || row['numero'] || row['Phone'] || row['Telephone']
      if (!rawPhone) { invalidCount++; return }
      const cleaned = rawPhone.toString().replace(/[\s\-().]/g, '')
      let phone = cleaned
      if (!phone.startsWith('+')) {
        phone = phone.startsWith('00') ? '+' + phone.slice(2) : `+225${phone.replace(/^0/, '')}`
      }
      if (phone.length < 10) { invalidCount++; return }
      if (seen.has(phone)) { duplicateCount++; return }
      seen.add(phone)
      const contact: Contact = { phone }
      Object.entries(row).forEach(([k, v]) => {
        if (!['phone', 'telephone', 'numero'].includes(k.toLowerCase())) {
          contact[k.toLowerCase()] = String(v)
        }
      })
      valid.push(contact)
    })

    setFichierContacts(valid)
    setImportStats({ total: rows.length, valid: valid.length, invalid: invalidCount, duplicates: duplicateCount })
    if (valid.length === 0) {
      toast.error('Aucun numéro valide. Vérifiez la colonne "phone" ou "telephone"')
    }
  }, [])

  const parseFile = useCallback((file: File) => {
    setFichierContacts([])
    setFichierNom(file.name)
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'csv') {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (r) => processRawContacts(r.data),
        error: () => toast.error('Impossible de lire le fichier CSV'),
      })
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const wb = XLSX.read(data, { type: 'array' })
          const sheet = wb.Sheets[wb.SheetNames[0]]
          processRawContacts(XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' }))
        } catch {
          toast.error('Impossible de lire le fichier Excel')
        }
      }
      reader.readAsArrayBuffer(file)
    } else {
      toast.error('Format non supporté. Utilisez CSV ou Excel (.xlsx)')
    }
  }, [processRawContacts])

  const removeFichier = () => {
    setFichierContacts([])
    setFichierNom('')
    setImportStats(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ---- Validation ----
  const validate = () => {
    const errs: Record<string, string> = {}
    if (nbContacts > 1 && !label.trim()) errs.label = 'Nom requis pour un envoi multiple'
    if (!senderNom) errs.sender = 'Choisissez un expéditeur'
    if (source === 'manuel' && parsedContacts.length === 0)
      errs.contacts = 'Saisissez au moins un numéro valide avec indicatif (+225...)'
    if (source === 'groupe' && !groupId) errs.contacts = 'Sélectionnez un groupe'
    if (source === 'fichier' && fichierContacts.length === 0)
      errs.contacts = 'Importez un fichier avec au moins un contact valide'
    if (!content.trim()) errs.content = 'Le message est vide'
    if (soldeSMS < coutTotal)
      errs.solde = `Solde insuffisant (${soldeSMS} SMS disponibles, ${coutTotal} requis)`
    if (scheduledAt && new Date(scheduledAt) <= new Date())
      errs.scheduledAt = 'La date de programmation doit être dans le futur'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const goToStep2 = () => { if (validate()) setStep(2) }

  // ---- Envoi ----
  const handleSubmit = async () => {
    setLoading(true)
    try {
      if (nbContacts === 1 && source === 'manuel') {
        const res = await fetch('/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: senderNom, to: parsedContacts[0].phone, content: content.trim() }),
        })
        const data = await res.json()
        if (!res.ok) { toast.error(data.error || 'Erreur lors de l\'envoi'); setStep(1); return }
        setResult({ nb: 1, solde: data.solde_restant })
        await updateSession({ solde_sms: data.solde_restant })
        toast.success('SMS envoyé avec succès !')
      } else {
        const body: Record<string, unknown> = {
          label: label.trim() || `Envoi du ${new Date().toLocaleDateString('fr-FR')}`,
          sender: senderNom,
          content: content.trim(),
          ...(scheduledAt && { scheduled_at: scheduledAt }),
        }
        if (source === 'groupe') body.group_id = groupId
        else if (source === 'fichier') body.contacts = fichierContacts
        else body.contacts = parsedContacts

        const res = await fetch('/api/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) { toast.error(data.error || 'Erreur lors de l\'envoi'); setStep(1); return }
        setResult({ nb: data.nb_contacts, solde: data.solde_restant })
        await updateSession({ solde_sms: data.solde_restant })
        toast.success(scheduledAt
          ? `Campagne programmée pour le ${new Date(scheduledAt).toLocaleString('fr-FR')}`
          : `${data.nb_contacts} SMS envoyés avec succès !`)
      }

      setLabel(''); setPhoneNumbers([]); setPhoneInputValue(''); setContent(''); setGroupId('')
      setScheduledAt(''); setFichierContacts([]); setFichierNom(''); setStep(1)
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
    <div className={cn('mx-auto space-y-6 animate-fade-in', step === 1 ? 'max-w-2xl' : 'max-w-4xl')}>
      {/* ---- En-tête ---- */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-syne font-bold text-xl text-foreground">Envoyer un SMS</h2>
          <p className="text-sm text-foreground-muted mt-0.5">
            Envoi unitaire ou en masse vers vos contacts
          </p>
        </div>
        <div className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shrink-0',
          soldeSMS === 0 ? 'text-danger bg-danger/10 border-danger/20'
            : soldeSMS < 20 ? 'text-warning bg-warning/10 border-warning/20'
            : 'text-primary bg-primary/10 border-primary/20'
        )}>
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
            <p className="text-xs text-danger/70 mt-0.5">Rechargez vos crédits pour pouvoir envoyer des SMS.</p>
            <Link href="/recharge" className="inline-flex items-center gap-1.5 mt-2 text-xs text-danger font-semibold hover:text-danger/80 transition-colors">
              <CreditCard className="w-3.5 h-3.5" />Recharger maintenant
            </Link>
          </div>
        </div>
      )}

      {/* ---- Indicateur d'étape ---- */}
      <div className="flex items-center gap-3">
        {[{ n: 1, label: 'Configuration' }, { n: 2, label: 'Confirmation' }].map(({ n, label: lbl }, i) => (
          <div key={n} className="flex items-center gap-2">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
              step === n ? 'bg-primary text-background' : step > n ? 'bg-secondary text-background' : 'bg-border text-foreground-muted'
            )}>
              {step > n ? '✓' : n}
            </div>
            <span className={cn('text-xs font-medium', step === n ? 'text-foreground' : 'text-foreground-muted')}>{lbl}</span>
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
              placeholder="Ex: Promo Tabaski 2026, Relance clients inactifs, Rappel RDV médical…"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className={cn('input', errors.label && 'border-danger')}
            />
            {errors.label && <p className="mt-1.5 text-xs text-danger">⚠ {errors.label}</p>}
          </div>

          {/* Expéditeur */}
          <div>
            <label className="label">Expéditeur (Sender ID)</label>
            {senders.length > 0 ? (
              <div className="relative">
                <select
                  value={senderNom}
                  onChange={(e) => setSenderNom(e.target.value)}
                  className={cn('input appearance-none pr-9', errors.sender && 'border-danger')}
                >
                  <option value="">-- Sélectionner un expéditeur --</option>
                  {senders.map((s) => {
                    const typeLabel = s.type_message === 'MARKETING' ? 'Marketing'
                      : s.type_message === 'OTP' ? 'OTP'
                      : s.type_message === 'TRANSACTIONAL' ? 'Transactionnel'
                      : null
                    return (
                      <option key={s.id} value={s.nom}>
                        {s.nom}{typeLabel ? ` (${typeLabel})` : ''}
                      </option>
                    )
                  })}
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
                  <Link href="/senders" className="text-primary hover:underline">Créer un sender</Link>{' '}
                  pour pouvoir envoyer des SMS avec votre nom d&apos;entreprise.
                </p>
              </div>
            )}
            {errors.sender && <p className="mt-1.5 text-xs text-danger">⚠ {errors.sender}</p>}
          </div>

          {/* Source des destinataires */}
          <div>
            <label className="label">Destinataires</label>
            <div className="flex gap-2 mb-3 flex-wrap">
              {([
                { value: 'manuel', label: 'Saisie manuelle', icon: PenLine },
                { value: 'groupe', label: 'Depuis un groupe', icon: Users },
                { value: 'fichier', label: 'Importer CSV/XLSX', icon: Upload },
              ] as const).map(({ value, label: lbl, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setSource(value); setGroupId(''); setPhoneNumbers([]); setPhoneInputValue(''); removeFichier() }}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all',
                    source === value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-foreground-muted hover:border-primary/40'
                  )}
                >
                  <Icon className="w-4 h-4" />{lbl}
                </button>
              ))}
            </div>

            {/* Saisie manuelle — tag input */}
            {source === 'manuel' && (
              <div className="space-y-2">
                <div
                  className={cn(
                    'input min-h-[80px] flex flex-wrap gap-2 p-2 cursor-text',
                    errors.contacts && 'border-danger'
                  )}
                  onClick={() => document.getElementById('phone-tag-input')?.focus()}
                >
                  {phoneNumbers.map((phone, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 bg-primary/15 text-primary text-sm font-mono px-2.5 py-1 rounded-lg shrink-0"
                    >
                      {phone}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removePhoneTag(i) }}
                        className="hover:text-danger transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                  <input
                    id="phone-tag-input"
                    type="text"
                    value={phoneInputValue}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val.endsWith(';')) {
                        addPhoneTag(val.slice(0, -1))
                      } else {
                        setPhoneInputValue(val)
                      }
                    }}
                    onKeyDown={handlePhoneKeyDown}
                    onBlur={() => { if (phoneInputValue.trim()) addPhoneTag(phoneInputValue) }}
                    placeholder={phoneNumbers.length === 0 ? '+2250707000001 — Entrée ou ; pour valider' : ''}
                    className="flex-1 min-w-[220px] bg-transparent outline-none text-sm font-mono placeholder:text-foreground-subtle py-1"
                  />
                </div>
                <p className="text-xs text-foreground-subtle">
                  Tapez un numéro avec indicatif (+225…) puis appuyez sur <kbd className="bg-border px-1 py-0.5 rounded text-[11px]">Entrée</kbd> ou <kbd className="bg-border px-1 py-0.5 rounded text-[11px]">;</kbd> pour l&apos;ajouter.
                </p>
                {phoneNumbers.length > 0 && (
                  <p className="text-xs text-secondary font-medium">
                    ✓ {phoneNumbers.length} numéro{phoneNumbers.length > 1 ? 's' : ''} ajouté{phoneNumbers.length > 1 ? 's' : ''}
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
                      className={cn('input appearance-none pr-9', errors.contacts && 'border-danger')}
                    >
                      <option value="">-- Sélectionner un groupe --</option>
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
                      <Users className="w-4 h-4 shrink-0" />Aucun groupe créé
                    </div>
                    <p className="text-xs text-foreground-subtle">
                      <Link href="/contacts" className="text-primary hover:underline">Créer un groupe</Link>{' '}
                      dans la section Contacts.
                    </p>
                  </div>
                )}
                {selectedGroup && (
                  <p className="mt-2 text-xs text-secondary font-medium">
                    ✓ {selectedGroup._count.contacts} destinataire{selectedGroup._count.contacts > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}

            {/* Import CSV/XLSX */}
            {source === 'fichier' && (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f) }}
                />

                {/* Zone de dépôt — toujours visible */}
                {fichierContacts.length === 0 && (
                  <div
                    onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) parseFile(f) }}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
                      errors.contacts ? 'border-danger/40 hover:border-danger/60' : 'border-border hover:border-primary/40'
                    )}
                  >
                    <Upload className="w-8 h-8 text-foreground-subtle mx-auto mb-3" />
                    <p className="text-sm text-foreground-muted font-medium">
                      Glissez votre fichier ici ou{' '}
                      <span className="text-primary">cliquez pour sélectionner</span>
                    </p>
                    <p className="text-xs text-foreground-subtle mt-1">
                      CSV ou Excel (.xlsx) · Colonne obligatoire : <code className="bg-border px-1 rounded">phone</code> (avec indicatif, ex: +22507…)
                    </p>
                  </div>
                )}

                {/* Stats après import */}
                {importStats && (
                  <div className="border border-border rounded-xl overflow-hidden">
                    {/* Fichier + bouton remplacer */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
                      <div className="flex items-center gap-2.5">
                        <FileSpreadsheet className="w-4 h-4 text-secondary shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate max-w-[200px]">{fichierNom}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-primary/10"
                          title="Importer un autre fichier"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Remplacer
                        </button>
                        <button onClick={removeFichier} className="text-foreground-subtle hover:text-danger transition-colors p-1">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Compteurs */}
                    <div className="px-4 py-3 space-y-2">
                      <p className="text-xs font-semibold text-foreground-subtle uppercase tracking-wider">Nombre de contacts</p>
                      <p className="text-2xl font-bold text-foreground">{importStats.total}</p>
                      <div className="flex items-center gap-5 pt-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-secondary inline-block" />
                          <span className="text-xs text-foreground-muted">Valides</span>
                          <span className="text-sm font-bold text-secondary">{importStats.valid}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-danger inline-block" />
                          <span className="text-xs text-foreground-muted">Invalides</span>
                          <span className="text-sm font-bold text-danger">{importStats.invalid}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-foreground-subtle inline-block" />
                          <span className="text-xs text-foreground-muted">Doublons</span>
                          <span className="text-sm font-bold text-foreground-muted">{importStats.duplicates}</span>
                        </div>
                      </div>
                    </div>

                    {/* Info contacts invalides */}
                    {importStats.invalid > 0 && (
                      <div className="border-t border-border px-4 py-3 bg-danger/5">
                        <p className="text-xs font-semibold text-danger mb-1">ⓘ Contacts invalides</p>
                        <p className="text-xs text-foreground-muted leading-relaxed">
                          Les contacts invalides ne respectent pas le format international de numéro de téléphone (ex: +22507XXXXXXXX). Corrigez la colonne <code className="bg-border px-1 rounded">phone</code> de votre fichier et réimportez.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Section Champs personnalisés */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-primary mb-1.5">ⓘ Champs personnalisés</p>
                  <p className="text-xs text-foreground-muted leading-relaxed mb-2">
                    Personnalisez chaque SMS avec les données de votre fichier. Ajoutez des colonnes <code className="bg-border px-1 rounded">nom</code>, <code className="bg-border px-1 rounded">prenom</code> dans votre CSV et utilisez les balises dans le message :
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {CHAMPS_DYNAMIQUES.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => insertDynamic(tag)}
                        className="text-xs bg-primary/10 text-primary hover:bg-primary/20 px-2 py-1 rounded-lg transition-colors font-mono"
                      >
                        {tag} →  insérer
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-foreground-subtle mt-2">
                    Exemple : <em className="text-foreground-muted">«&nbsp;Bonjour &#123;prenom&#125;, votre commande est prête&nbsp;»</em> → chaque destinataire reçoit son propre prénom.
                  </p>
                </div>
              </div>
            )}

            {errors.contacts && <p className="mt-1.5 text-xs text-danger">⚠ {errors.contacts}</p>}
          </div>

          {/* Message */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">Message</label>
              <div className="flex items-center gap-1.5">
                {templates.length > 0 && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowTemplateLoad(!showTemplateLoad)}
                      className="flex items-center gap-1 text-xs text-foreground-muted hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-primary/10"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />Charger
                    </button>
                    {showTemplateLoad && (
                      <div className="absolute right-0 top-8 z-10 bg-surface border border-border rounded-xl shadow-lg p-2 min-w-48 space-y-1">
                        {templates.map((t) => (
                          <div key={t.name} className="flex items-center gap-2 group">
                            <button
                              type="button"
                              onClick={() => handleLoadTemplate(t)}
                              className="flex-1 text-left text-xs text-foreground px-2 py-1.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors truncate"
                            >
                              {t.name}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTemplate(t.name)}
                              className="opacity-0 group-hover:opacity-100 text-foreground-subtle hover:text-danger transition-all"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowTemplateSave(!showTemplateSave)}
                  className="flex items-center gap-1 text-xs text-foreground-muted hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-primary/10"
                >
                  <BookMarked className="w-3.5 h-3.5" />Enregistrer
                </button>
              </div>
            </div>

            {showTemplateSave && (
              <div className="flex gap-2 mb-2 animate-slide-up">
                <input
                  type="text"
                  placeholder="Nom du modèle (ex: Promo été)"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplate()}
                  className="input flex-1 text-sm py-1.5"
                />
                <Button type="button" size="sm" onClick={handleSaveTemplate} leftIcon={<Save className="w-3.5 h-3.5" />}>OK</Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => setShowTemplateSave(false)}><X className="w-3.5 h-3.5" /></Button>
              </div>
            )}

            <div className="relative">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={source === 'fichier'
                  ? "Ex: Bonjour {prenom}, votre commande N°{ref} est prête ! Récupérez-la avant 18h."
                  : "Ex: Cher client, bénéficiez de -30% sur tous nos articles jusqu'au 31 juillet. Répondez STOP pour vous désabonner."}
                rows={5}
                maxLength={918}
                className={cn('input resize-none', errors.content && 'border-danger')}
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <span className={cn('text-xs font-mono', charsRemaining < 20 ? 'text-warning' : 'text-foreground-subtle')}>
                  {content.length}/{partCount <= 1 ? '160' : `${partCount * 153}`}
                </span>
                <span className="text-xs bg-border text-foreground-muted px-1.5 py-0.5 rounded font-medium">
                  {partCount} SMS{nbContacts > 1 ? '/contact' : ''}
                </span>
              </div>
            </div>
            {errors.content && <p className="mt-1.5 text-xs text-danger">⚠ {errors.content}</p>}
            {content.length > 160 && (
              <p className="mt-1.5 text-xs text-warning">
                Message long : découpé en {partCount} SMS ({partCount} crédit{partCount > 1 ? 's' : ''} par destinataire)
              </p>
            )}
          </div>

          {/* Programmation */}
          <div>
            <label className="label flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-foreground-subtle" />
              Programmation{' '}
              <span className="text-foreground-subtle font-normal">(optionnel — envoi immédiat si vide)</span>
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
              className={cn('input', errors.scheduledAt && 'border-danger')}
            />
            {scheduledAt && !errors.scheduledAt && (
              <p className="mt-1.5 text-xs text-secondary font-medium">
                Envoi programmé le {new Date(scheduledAt).toLocaleString('fr-FR')}
              </p>
            )}
            {errors.scheduledAt && <p className="mt-1.5 text-xs text-danger">⚠ {errors.scheduledAt}</p>}
          </div>

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
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border text-right">
              <h3 className="font-syne font-semibold text-base text-foreground">Récapitulatif de l&apos;envoi</h3>
              <p className="text-xs text-foreground-muted mt-0.5">Vérifiez les informations avant de confirmer</p>
            </div>

            {/* Body : phone mockup + summary */}
            <div className="flex flex-col sm:flex-row gap-0">

              {/* ---- Phone mockup ---- */}
              <div className="sm:w-[400px] shrink-0 flex items-center justify-center bg-background/60 border-b sm:border-b-0 sm:border-r border-border py-6 px-6">
                <div className="relative w-full max-w-[320px]">
                  {/* Phone shell */}
                  <div className="relative bg-[#1a1a2e] rounded-[2.5rem] border-[5px] border-[#2a2a4a] shadow-2xl pt-10 pb-6 px-5">
                    {/* Notch */}
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-2.5 bg-[#2a2a4a] rounded-full" />
                    {/* Screen */}
                    <div className="bg-[#f0f0f5] rounded-2xl overflow-hidden min-h-[280px] flex flex-col">
                      {/* SMS header */}
                      <div className="bg-[#e8e8ef] px-4 py-3 flex items-center gap-3 border-b border-[#d8d8e8]">
                        <div className="w-10 h-10 rounded-full bg-primary/80 flex items-center justify-center shrink-0">
                          <span className="text-[14px] font-bold text-white">{senderNom.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-[#222] leading-none">{senderNom}</p>
                          <p className="text-[11px] text-[#888] mt-0.5">SMS</p>
                        </div>
                      </div>
                      {/* Message bubble */}
                      <div className="flex-1 p-4 flex flex-col gap-2">
                        <div className="bg-[#e2fce7] rounded-2xl rounded-tl-none px-4 py-3 max-w-[95%] shadow-sm">
                          <p className="text-[13px] leading-[1.6] text-[#1a1a1a] break-words whitespace-pre-wrap">
                            {content.length > 160 ? content.slice(0, 157) + '…' : content || '(message vide)'}
                          </p>
                        </div>
                        <div className="flex justify-end">
                          <span className="text-[11px] text-[#aaa]">Maintenant ✓✓</span>
                        </div>
                      </div>
                    </div>
                    {/* Home bar */}
                    <div className="mt-5 mx-auto w-16 h-1.5 bg-[#2a2a4a] rounded-full" />
                  </div>
                </div>
              </div>

              {/* ---- Summary ---- */}
              <div className="flex-1 px-6 py-5 space-y-0 divide-y divide-border">
                {label && (
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-xs font-medium text-foreground-subtle uppercase tracking-wider">Libellé</span>
                    <span className="text-sm text-foreground font-semibold text-right max-w-[60%] truncate">{label}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-xs font-medium text-foreground-subtle uppercase tracking-wider">Expéditeur</span>
                  <span className="text-sm text-foreground font-semibold font-mono">{senderNom}</span>
                </div>
                <div className="flex items-start justify-between py-2.5 gap-4">
                  <span className="text-xs font-medium text-foreground-subtle uppercase tracking-wider shrink-0">Destinataires</span>
                  <span className="text-sm text-foreground font-semibold text-right">
                    {nbContacts} contact{nbContacts > 1 ? 's' : ''}
                    {source === 'groupe' && selectedGroup && (
                      <span className="block text-xs text-foreground-muted font-normal">{selectedGroup.nom}</span>
                    )}
                    {source === 'fichier' && fichierNom && (
                      <span className="block text-xs text-foreground-muted font-normal truncate max-w-[120px]">{fichierNom}</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-xs font-medium text-foreground-subtle uppercase tracking-wider">SMS par contact</span>
                  <span className="text-sm text-foreground font-semibold">{partCount} SMS</span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-xs font-medium text-foreground-subtle uppercase tracking-wider">Total SMS débités</span>
                  <span className="text-sm font-bold text-warning">{coutTotal.toLocaleString('fr-FR')} SMS</span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-xs font-medium text-foreground-subtle uppercase tracking-wider">Coût estimé</span>
                  <span className="text-sm font-bold text-foreground">{formatFCFA(coutFCFA)}</span>
                </div>
                {scheduledAt && (
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-xs font-medium text-foreground-subtle uppercase tracking-wider">Programmé le</span>
                    <span className="text-sm font-semibold text-primary flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(scheduledAt).toLocaleString('fr-FR')}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-3 pb-1">
                  <span className="text-xs font-medium text-foreground-subtle uppercase tracking-wider">Solde après envoi</span>
                  <span className={cn('text-base font-bold', soldeApres < 0 ? 'text-danger' : 'text-secondary')}>
                    {soldeApres.toLocaleString('fr-FR')} SMS
                  </span>
                </div>
              </div>
            </div>
          </div>

          {soldeSMS < coutTotal && (
            <div className="flex items-start gap-3 bg-danger/8 border border-danger/20 rounded-xl px-4 py-4">
              <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-danger font-semibold">Solde insuffisant</p>
                <p className="text-xs text-danger/70 mt-0.5">Il vous manque {coutTotal - soldeSMS} SMS.</p>
                <Link href="/recharge" className="inline-flex items-center gap-1.5 mt-2 text-xs text-danger font-semibold hover:text-danger/80 transition-colors">
                  <CreditCard className="w-3.5 h-3.5" />Recharger maintenant
                </Link>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(1)} className="flex-1" size="lg">Modifier</Button>
            <Button
              onClick={handleSubmit}
              loading={loading}
              disabled={soldeSMS < coutTotal}
              className="flex-1"
              size="lg"
              leftIcon={<Send className="w-4 h-4" />}
            >
              {scheduledAt ? 'Programmer l\'envoi' : nbContacts === 1 ? 'Envoyer le SMS' : `Envoyer à ${nbContacts} contacts`}
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
              Solde restant : <span className="font-semibold">{result.solde} SMS</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
