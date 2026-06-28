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
import { cn, getSMSPartCount, formatFCFA, COUNTRY_PHONE_PREFIXES } from '@/lib/utils'

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
const PAYS = Object.entries(COUNTRY_PHONE_PREFIXES).map(([code, { name, prefix }]) => ({ code, name, prefix }))

// ============================================================
// HELPERS
// ============================================================

function parseManualNumbers(input: string): Contact[] {
  return input
    .split(/[;,\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((raw) => {
      const cleaned = raw.replace(/[\s\-().]/g, '')
      let phone = cleaned
      if (!phone.startsWith('+')) {
        if (phone.startsWith('00')) phone = '+' + phone.slice(2)
      }
      return { phone }
    })
    .filter((c) => c.phone.startsWith('+') && c.phone.length >= 10)
}

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
  const [manuelInput, setManuelInput] = useState('')
  const [groupId, setGroupId] = useState('')
  const [fichierContacts, setFichierContacts] = useState<Contact[]>([])
  const [fichierNom, setFichierNom] = useState('')
  const [defaultCountry, setDefaultCountry] = useState('CI')
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

  const parsedContacts = source === 'manuel' ? parseManualNumbers(manuelInput) : []
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
    const prefix = COUNTRY_PHONE_PREFIXES[defaultCountry as keyof typeof COUNTRY_PHONE_PREFIXES]?.prefix || '+225'
    const valid: Contact[] = []
    rows.forEach((row) => {
      const rawPhone = row['phone'] || row['telephone'] || row['numero'] || row['Phone'] || row['Telephone']
      if (!rawPhone) return
      const cleaned = rawPhone.toString().replace(/[\s\-().]/g, '')
      let phone = cleaned
      if (!phone.startsWith('+')) {
        phone = phone.startsWith('00') ? '+' + phone.slice(2) : `${prefix}${phone.replace(/^0/, '')}`
      }
      if (phone.length < 10) return
      const contact: Contact = { phone }
      Object.entries(row).forEach(([k, v]) => {
        if (!['phone', 'telephone', 'numero'].includes(k.toLowerCase())) {
          contact[k.toLowerCase()] = String(v)
        }
      })
      valid.push(contact)
    })
    setFichierContacts(valid)
    if (valid.length > 0) {
      toast.success(`${valid.length} contact${valid.length > 1 ? 's' : ''} importé${valid.length > 1 ? 's' : ''}`)
    } else {
      toast.error('Aucun numéro valide. Vérifiez la colonne "phone" ou "telephone"')
    }
  }, [defaultCountry])

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

      setLabel(''); setManuelInput(''); setContent(''); setGroupId('')
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
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
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
              placeholder="Ex: Promo juillet 2026, Rappel RDV..."
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
                  {senders.map((s) => (
                    <option key={s.id} value={s.nom}>{s.nom}</option>
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
                  onClick={() => { setSource(value); setGroupId(''); setManuelInput(''); removeFichier() }}
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

            {/* Saisie manuelle */}
            {source === 'manuel' && (
              <div className="space-y-2">
                <textarea
                  value={manuelInput}
                  onChange={(e) => setManuelInput(e.target.value)}
                  placeholder={`Entrez les numéros avec indicatif pays\nEx: +2250707000001; +2210707000002\nUn numéro par ligne ou séparés par ";"`}
                  rows={4}
                  className={cn('input resize-none font-mono text-sm', errors.contacts && 'border-danger')}
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
                {fichierContacts.length === 0 ? (
                  <div>
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
                        CSV ou Excel · Colonne requise : <code className="bg-border px-1 rounded">phone</code>
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f) }}
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <label className="text-xs text-foreground-subtle">Pays par défaut :</label>
                      <select
                        value={defaultCountry}
                        onChange={(e) => setDefaultCountry(e.target.value)}
                        className="input py-1 text-xs w-auto"
                      >
                        {PAYS.map((p) => (
                          <option key={p.code} value={p.code}>{p.name} ({p.prefix})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="bg-secondary/5 border border-secondary/20 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-5 h-5 text-secondary" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{fichierNom}</p>
                        <p className="text-xs text-foreground-muted">
                          {fichierContacts.length} contact{fichierContacts.length > 1 ? 's' : ''} valide{fichierContacts.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <button onClick={removeFichier} className="text-foreground-subtle hover:text-danger transition-colors p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {errors.contacts && <p className="mt-1.5 text-xs text-danger">⚠ {errors.contacts}</p>}
          </div>

          {/* Message */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">Message</label>
              <div className="flex items-center gap-1.5">
                {/* Champs dynamiques (utiles surtout avec import fichier) */}
                {(source === 'fichier' || fichierContacts.length > 0) && CHAMPS_DYNAMIQUES.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertDynamic(tag)}
                    className="text-xs bg-border text-foreground-muted hover:text-primary hover:bg-primary/10 px-1.5 py-0.5 rounded transition-colors font-mono"
                  >
                    {tag}
                  </button>
                ))}
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
                  ? "Ex: Bonjour {prenom}, profitez de -20% jusqu'au 31 juillet !"
                  : "Ex: Bonjour, profitez de -20% sur toute notre collection jusqu'au 31 juillet."}
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
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
            <h3 className="font-syne font-semibold text-base text-foreground">Résumé avant envoi</h3>
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
                  {source === 'fichier' && fichierNom && ` (${fichierNom})`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground-muted">SMS par contact</span>
                <span className="text-sm text-foreground">{partCount} SMS</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground-muted">Total SMS débités</span>
                <span className="text-sm font-bold text-warning">{coutTotal.toLocaleString('fr-FR')} SMS</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground-muted">Coût estimé</span>
                <span className="text-sm font-bold text-foreground">{formatFCFA(coutFCFA)}</span>
              </div>
              {scheduledAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground-muted">Programmé le</span>
                  <span className="text-sm font-semibold text-primary flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(scheduledAt).toLocaleString('fr-FR')}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="text-sm text-foreground-muted">Solde après envoi</span>
                <span className={cn('text-sm font-bold', soldeApres < 0 ? 'text-danger' : 'text-secondary')}>
                  {soldeApres.toLocaleString('fr-FR')} SMS
                </span>
              </div>
            </div>

            <div className="bg-background border border-border rounded-xl p-4">
              <p className="text-xs text-foreground-subtle mb-2 font-medium uppercase tracking-wider">Aperçu du message</p>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{content || '(message vide)'}</p>
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
