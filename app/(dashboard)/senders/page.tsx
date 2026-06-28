'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  Tag,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Info,
  ChevronDown,
  X,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import { cn, formatDate } from '@/lib/utils'

// ============================================================
// TYPES
// ============================================================

interface Sender {
  id: string
  nom: string
  statut: 'PENDING' | 'APPROVED' | 'REJECTED'
  type_message: string | null
  activite: string | null
  created_at: string
}

const TYPE_OPTIONS = [
  { value: 'PROMOTIONAL', label: 'Promotionnel', desc: 'Offres, réductions, événements marketing' },
  { value: 'TRANSACTIONAL', label: 'Transactionnel', desc: 'Confirmations, notifications de service' },
  { value: 'OTP', label: 'OTP', desc: 'Codes de vérification et authentification' },
]

const STATUT_CONFIG = {
  PENDING: {
    label: 'En attente',
    icon: Clock,
    color: 'text-warning bg-warning/10 border-warning/20',
    desc: 'Votre demande est en cours de traitement.',
  },
  APPROVED: {
    label: 'Actif',
    icon: CheckCircle2,
    color: 'text-secondary bg-secondary/10 border-secondary/20',
    desc: 'Ce sender est actif et utilisable pour vos envois.',
  },
  REJECTED: {
    label: 'Désactivé',
    icon: XCircle,
    color: 'text-danger bg-danger/10 border-danger/20',
    desc: 'Ce sender a été désactivé. Contactez le support.',
  },
}

// ============================================================
// PAGE
// ============================================================

export default function SendersPage() {
  const [senders, setSenders] = useState<Sender[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [form, setForm] = useState({
    nom: '',
    type_message: '',
    description: '',
    email_contact: '',
    site_web: '',
    adresse: '',
    siege_social: '',
    exemple_message: '',
    activite: '',
  })
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const fetchSenders = async () => {
    try {
      const res = await fetch('/api/senders')
      const data = await res.json()
      setSenders(data.senders || [])
    } catch {
      toast.error('Impossible de charger les senders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSenders() }, [])

  const handleChange = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: [] }))
    }

  const resetForm = () => {
    setForm({ nom: '', type_message: '', description: '', email_contact: '', site_web: '', adresse: '', siege_social: '', exemple_message: '', activite: '' })
    setErrors({})
    setShowForm(false)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setErrors({})

    try {
      const res = await fetch('/api/senders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!res.ok) {
        setErrors(data.errors || {})
        if (data.error) toast.error(data.error)
        return
      }

      const statut = data.sender.statut
      if (statut === 'APPROVED') {
        toast.success(`Sender "${form.nom}" créé et activé avec succès !`)
      } else {
        toast.success('Demande soumise. En attente de validation.')
      }
      setSenders((prev) => [data.sender, ...prev])
      resetForm()
    } catch {
      toast.error('Erreur réseau. Réessayez.')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string, nom: string) => {
    if (!confirm(`Supprimer le sender "${nom}" ?`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/senders/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSenders((prev) => prev.filter((s) => s.id !== id))
        toast.success('Sender supprimé')
      } else {
        toast.error('Impossible de supprimer ce sender')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setDeletingId(null)
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
          <h2 className="font-syne font-bold text-xl text-foreground">Mes Senders</h2>
          <p className="text-sm text-foreground-muted mt-0.5">
            Nom d&apos;expéditeur affiché sur les SMS reçus par vos contacts
          </p>
        </div>
        {!showForm && (
          <Button
            leftIcon={<Plus className="w-4 h-4" />}
            size="sm"
            onClick={() => setShowForm(true)}
          >
            Nouveau sender
          </Button>
        )}
      </div>

      {/* ---- Info ---- */}
      <div className="flex items-start gap-3 bg-primary/5 border border-primary/15 rounded-xl px-4 py-3.5">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-foreground-muted leading-relaxed">
          Un <strong className="text-foreground">Sender ID</strong> est le nom affiché à la place
          du numéro sur les SMS reçus par vos contacts (ex :{' '}
          <span className="font-mono text-primary">MonBusiness</span>). Maximum 11 caractères.{' '}
          Chaque demande est soumise à <strong className="text-foreground">validation par notre équipe</strong> avant activation.
        </p>
      </div>

      {/* ---- Formulaire ---- */}
      {showForm && (
        <div className="bg-surface border border-border rounded-2xl p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-syne font-semibold text-base text-foreground">
              Nouveau Sender ID
            </h3>
            <button
              onClick={resetForm}
              className="text-foreground-subtle hover:text-foreground transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            {/* Sender ID */}
            <div>
              <label className="label">
                Sender ID <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: MIDIT, MONSHOP, CLINIQUE (max 11 car.)"
                value={form.nom}
                onChange={handleChange('nom')}
                maxLength={11}
                className={cn('input', errors.nom && 'border-danger')}
              />
              <p className="mt-1 text-xs text-foreground-subtle">
                {form.nom.length}/11 caractères · Lettres, chiffres, espaces et tirets uniquement
              </p>
              {errors.nom?.map((e) => <p key={e} className="mt-1 text-xs text-danger">⚠ {e}</p>)}
            </div>

            {/* Type de message */}
            <div>
              <label className="label">
                Type de message <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <select
                  value={form.type_message}
                  onChange={handleChange('type_message')}
                  className={cn('input appearance-none pr-9', errors.type_message && 'border-danger')}
                >
                  <option value="">-- Sélectionner le type --</option>
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle pointer-events-none" />
              </div>
              {form.type_message && (
                <p className="mt-1 text-xs text-foreground-subtle">
                  {TYPE_OPTIONS.find((t) => t.value === form.type_message)?.desc}
                </p>
              )}
              {errors.type_message?.map((e) => <p key={e} className="mt-1 text-xs text-danger">⚠ {e}</p>)}
            </div>

            {/* Description */}
            <div>
              <label className="label">
                Description du contenu <span className="text-danger">*</span>
              </label>
              <textarea
                placeholder="Ex: Envoi de messages promotionnels, offres spéciales, réductions, nouveaux menus, événements et campagnes marketing du restaurant."
                value={form.description}
                onChange={handleChange('description')}
                rows={3}
                className={cn('input resize-none', errors.description && 'border-danger')}
              />
              {errors.description?.map((e) => <p key={e} className="mt-1 text-xs text-danger">⚠ {e}</p>)}
            </div>

            {/* Email de contact */}
            <div>
              <label className="label">
                Email de contact <span className="text-danger">*</span>
              </label>
              <input
                type="email"
                placeholder="Ex: contact@monentreprise.com"
                value={form.email_contact}
                onChange={handleChange('email_contact')}
                className={cn('input', errors.email_contact && 'border-danger')}
              />
              {errors.email_contact?.map((e) => <p key={e} className="mt-1 text-xs text-danger">⚠ {e}</p>)}
            </div>

            {/* Site web */}
            <div>
              <label className="label">
                Site web ou application{' '}
                <span className="text-foreground-subtle font-normal">(optionnel)</span>
              </label>
              <input
                type="text"
                placeholder="Ex: www.monrestaurant.ci ou Facebook: Midit Lounge Garden"
                value={form.site_web}
                onChange={handleChange('site_web')}
                className="input"
              />
            </div>

            {/* Adresse */}
            <div>
              <label className="label">
                Adresse de l&apos;entreprise <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Angré, près du CHU d'Angré, Abidjan"
                value={form.adresse}
                onChange={handleChange('adresse')}
                className={cn('input', errors.adresse && 'border-danger')}
              />
              {errors.adresse?.map((e) => <p key={e} className="mt-1 text-xs text-danger">⚠ {e}</p>)}
            </div>

            {/* Siège social */}
            <div>
              <label className="label">
                Siège social <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Abidjan, Côte d'Ivoire"
                value={form.siege_social}
                onChange={handleChange('siege_social')}
                className={cn('input', errors.siege_social && 'border-danger')}
              />
              {errors.siege_social?.map((e) => <p key={e} className="mt-1 text-xs text-danger">⚠ {e}</p>)}
            </div>

            {/* Exemple de message */}
            <div>
              <label className="label">
                Exemple(s) de message <span className="text-danger">*</span>
              </label>
              <textarea
                placeholder={`Ex:\n1. MIDIT : Profitez de nos offres spéciales ce week-end. Réservez votre table dès maintenant.\n2. MIDIT : Découvrez notre nouveau menu de saison ! Venez nous rendre visite à Angré.\n3. MIDIT : Ce soir, soirée spéciale au restaurant MIDIT. Places limitées, réservez vite !`}
                value={form.exemple_message}
                onChange={handleChange('exemple_message')}
                rows={5}
                className={cn('input resize-none text-sm', errors.exemple_message && 'border-danger')}
              />
              {errors.exemple_message?.map((e) => <p key={e} className="mt-1 text-xs text-danger">⚠ {e}</p>)}
            </div>

            {/* Secteur d'activité */}
            <div>
              <label className="label">
                Secteur d&apos;activité <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Restaurant, Centre médical, Pharmacie, Banque, E-commerce..."
                value={form.activite}
                onChange={handleChange('activite')}
                className={cn('input', errors.activite && 'border-danger')}
              />
              {errors.activite?.map((e) => <p key={e} className="mt-1 text-xs text-danger">⚠ {e}</p>)}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={resetForm}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button type="submit" loading={creating} className="flex-1">
                Créer le sender
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ---- Onglets ---- */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 w-fit">
        {([
          { value: 'PENDING', label: 'En attente', icon: Clock },
          { value: 'APPROVED', label: 'Actifs', icon: CheckCircle2 },
          { value: 'REJECTED', label: 'Désactivés', icon: XCircle },
        ] as const).map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === value ? 'bg-primary/10 text-primary' : 'text-foreground-muted hover:text-foreground'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {(() => {
              const n = senders.filter(s => s.statut === value).length
              return n > 0 ? (
                <span className={cn(
                  'text-xs rounded-full px-1.5 py-0.5 font-bold',
                  tab === value ? 'bg-primary text-background' : 'bg-border text-foreground-muted'
                )}>{n}</span>
              ) : null
            })()}
          </button>
        ))}
      </div>

      {/* ---- Liste des senders ---- */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : senders.filter(s => s.statut === tab).length === 0 ? (
          <div className="py-16 text-center">
            <Tag className="w-10 h-10 text-foreground-subtle mx-auto mb-3" />
            {tab === 'PENDING' && (
              <>
                <p className="text-sm text-foreground-muted">Aucun sender en attente</p>
                <p className="text-xs text-foreground-subtle mt-1">Créez votre premier sender pour personnaliser vos envois</p>
                <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} className="mt-4" onClick={() => setShowForm(true)}>
                  Créer un sender
                </Button>
              </>
            )}
            {tab === 'APPROVED' && <p className="text-sm text-foreground-muted">Aucun sender actif</p>}
            {tab === 'REJECTED' && <p className="text-sm text-foreground-muted">Aucun sender désactivé</p>}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {senders.filter(s => s.statut === tab).map((sender) => {
              const config = STATUT_CONFIG[sender.statut]
              const Icon = config.icon

              return (
                <div
                  key={sender.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-background/30 transition-colors"
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center border shrink-0',
                      config.color
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-foreground font-mono">{sender.nom}</p>
                      <span className={cn('badge border', config.color)}>{config.label}</span>
                      {sender.type_message && (
                        <span className="badge border border-border text-foreground-muted">
                          {sender.type_message === 'PROMOTIONAL' ? 'Promotionnel'
                            : sender.type_message === 'OTP' ? 'OTP'
                            : 'Transactionnel'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-foreground-subtle mt-0.5">
                      Créé le {formatDate(sender.created_at)}
                      {sender.activite && ` · ${sender.activite}`}
                    </p>
                    {sender.statut !== 'APPROVED' && (
                      <p className="text-xs text-foreground-subtle mt-1 italic">
                        {config.desc}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(sender.id, sender.nom)}
                    disabled={deletingId === sender.id}
                    className="text-foreground-subtle hover:text-danger transition-colors p-2 rounded-lg hover:bg-danger/8 disabled:opacity-50"
                    aria-label={`Supprimer ${sender.nom}`}
                  >
                    {deletingId === sender.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
