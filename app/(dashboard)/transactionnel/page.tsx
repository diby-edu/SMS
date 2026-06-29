'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  Zap,
  Key,
  Code2,
  Plus,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Tag,
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Globe,
  Loader2,
  ShoppingCart,
  Link,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'

// ============================================================
// TYPES
// ============================================================

interface ApiKey {
  id: string
  name: string
  key: string
  is_active: boolean
  default_transactional_sender: string | null
  dlr_webhook_url: string | null
  last_used: string | null
  created_at: string
  _count: { otpCodes: number }
}

interface TransactionalSender {
  id: string
  nom: string
}

interface ChariowConfig {
  id: string
  sender: string
  token: string
  events_disabled: string[]
  is_active: boolean
  created_at: string
}

const CHARIOW_EVENTS = [
  { value: 'successful.sale', label: 'Vente réussie' },
  { value: 'abandoned.sale', label: 'Vente abandonnée' },
  { value: 'failed.sale', label: 'Vente échouée' },
  { value: 'license.activated', label: 'Licence activée' },
  { value: 'license.expired', label: 'Licence expirée' },
  { value: 'license.issued', label: 'Licence émise' },
  { value: 'license.revoked', label: 'Licence révoquée' },
  { value: 'affiliate.joined', label: 'Affilié a rejoint' },
]

interface Stats {
  total: number
  thisMonth: number
  delivered: number
  failed: number
  tauxLivraison: number
}

// ============================================================
// COMPOSANTS UTILITAIRES
// ============================================================

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-foreground-muted font-medium uppercase tracking-wide">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-syne font-bold text-foreground">{value}</p>
    </div>
  )
}

function ApiKeyCard({
  apiKey,
  transactionalSenders,
  onDelete,
  onUpdate,
}: {
  apiKey: ApiKey
  transactionalSenders: TransactionalSender[]
  onDelete: (id: string) => void
  onUpdate: (id: string, patch: Partial<ApiKey>) => void
}) {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Sender par défaut
  const [editingSender, setEditingSender] = useState(false)
  const [selectedSender, setSelectedSender] = useState(apiKey.default_transactional_sender ?? '')
  const [savingSender, setSavingSender] = useState(false)

  // Webhook DLR
  const [editingWebhook, setEditingWebhook] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState(apiKey.dlr_webhook_url ?? '')
  const [savingWebhook, setSavingWebhook] = useState(false)

  const maskedKey = apiKey.key.slice(0, 12) + '••••••••••••••••••••••••••••••••'

  const copyKey = async () => {
    await navigator.clipboard.writeText(apiKey.key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDelete = async () => {
    if (!confirm(`Supprimer la clé "${apiKey.name}" ? Cette action est irréversible.`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/otp/keys/${apiKey.id}`, { method: 'DELETE' })
      if (res.ok) onDelete(apiKey.id)
    } finally {
      setDeleting(false)
    }
  }

  const saveSender = async () => {
    setSavingSender(true)
    try {
      const res = await fetch(`/api/otp/keys/${apiKey.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ default_transactional_sender: selectedSender || null }),
      })
      if (res.ok) {
        onUpdate(apiKey.id, { default_transactional_sender: selectedSender || null })
        setEditingSender(false)
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erreur lors de la sauvegarde')
      }
    } finally {
      setSavingSender(false)
    }
  }

  const saveWebhook = async () => {
    setSavingWebhook(true)
    try {
      const res = await fetch(`/api/otp/keys/${apiKey.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dlr_webhook_url: webhookUrl || null }),
      })
      if (res.ok) {
        onUpdate(apiKey.id, { dlr_webhook_url: webhookUrl || null })
        setEditingWebhook(false)
        toast.success('Webhook DLR mis à jour')
      } else {
        const data = await res.json()
        toast.error(data.error || 'URL invalide')
      }
    } finally {
      setSavingWebhook(false)
    }
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
      {/* Nom + actions */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-foreground text-sm">{apiKey.name}</p>
          <p className="text-xs text-foreground-muted mt-0.5">
            {apiKey.last_used
              ? `Dernière utilisation : ${new Date(apiKey.last_used).toLocaleDateString('fr-FR')}`
              : 'Jamais utilisée'}
          </p>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-1.5 text-foreground-subtle hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
          title="Supprimer"
        >
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Clé API */}
      <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-2 border border-border">
        <Key className="w-3.5 h-3.5 text-foreground-subtle shrink-0" />
        <code className="text-xs text-foreground-muted font-mono flex-1 truncate">
          {visible ? apiKey.key : maskedKey}
        </code>
        <button onClick={() => setVisible(!visible)} className="text-foreground-subtle hover:text-foreground transition-colors">
          {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
        <button onClick={copyKey} className="text-foreground-subtle hover:text-primary transition-colors">
          {copied ? <Check className="w-3.5 h-3.5 text-secondary" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Sender transactionnel par défaut */}
      <div className="bg-background border border-border rounded-lg px-3 py-2.5 space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-foreground-subtle mb-1">
          <Tag className="w-3 h-3" />
          <span className="font-medium">Sender par défaut</span>
        </div>
        {editingSender ? (
          <div className="flex items-center gap-2">
            <select
              value={selectedSender}
              onChange={(e) => setSelectedSender(e.target.value)}
              className="flex-1 bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
            >
              <option value="">-- Sélectionner --</option>
              {transactionalSenders.map((s) => (
                <option key={s.id} value={s.nom}>{s.nom}</option>
              ))}
            </select>
            <button onClick={saveSender} disabled={savingSender} className="text-xs text-secondary font-semibold hover:underline disabled:opacity-50">
              {savingSender ? '...' : 'OK'}
            </button>
            <button onClick={() => { setEditingSender(false); setSelectedSender(apiKey.default_transactional_sender ?? '') }} className="text-xs text-foreground-subtle hover:text-foreground">✕</button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className={apiKey.default_transactional_sender ? 'font-mono text-xs text-foreground font-medium' : 'text-xs text-danger font-medium'}>
              {apiKey.default_transactional_sender ?? 'Non configuré'}
            </span>
            {transactionalSenders.length > 0 && (
              <button onClick={() => setEditingSender(true)} className="text-xs text-primary hover:underline">modifier</button>
            )}
          </div>
        )}
      </div>

      {/* Webhook DLR */}
      <div className="bg-background border border-border rounded-lg px-3 py-2.5 space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-foreground-subtle mb-1">
          <Globe className="w-3 h-3" />
          <span className="font-medium">Webhook DLR (accusés de livraison)</span>
        </div>
        {editingWebhook ? (
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://monapp.com/webhook/dlr"
              className="flex-1 bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
            />
            <button onClick={saveWebhook} disabled={savingWebhook} className="text-xs text-secondary font-semibold hover:underline disabled:opacity-50">
              {savingWebhook ? '...' : 'OK'}
            </button>
            <button onClick={() => { setEditingWebhook(false); setWebhookUrl(apiKey.dlr_webhook_url ?? '') }} className="text-xs text-foreground-subtle hover:text-foreground">✕</button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <span className={`text-xs truncate ${apiKey.dlr_webhook_url ? 'font-mono text-foreground' : 'text-foreground-subtle'}`}>
              {apiKey.dlr_webhook_url ?? 'Non configuré'}
            </span>
            <button onClick={() => setEditingWebhook(true)} className="text-xs text-primary hover:underline shrink-0">modifier</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// COMPOSANT CHARIOW CONFIG CARD
// ============================================================

function ChariowCard({
  config,
  onDelete,
  onToggleEvent,
}: {
  config: ChariowConfig
  onDelete: (id: string) => void
  onToggleEvent: (id: string, events_disabled: string[]) => void
}) {
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [togglingEvent, setTogglingEvent] = useState<string | null>(null)

  const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://sms.numerik360.com'}/api/webhooks/chariow/${config.token}`

  const copyUrl = async () => {
    await navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDelete = async () => {
    if (!confirm('Supprimer cette intégration Chariow ? L\'URL webhook sera désactivée.')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/chariow/config/${config.id}`, { method: 'DELETE' })
      if (res.ok) onDelete(config.id)
    } finally {
      setDeleting(false)
    }
  }

  const toggleEvent = async (eventValue: string) => {
    setTogglingEvent(eventValue)
    const isDisabled = config.events_disabled.includes(eventValue)
    const newDisabled = isDisabled
      ? config.events_disabled.filter((e) => e !== eventValue)
      : [...config.events_disabled, eventValue]
    try {
      const res = await fetch(`/api/chariow/config/${config.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events_disabled: newDisabled }),
      })
      if (res.ok) onToggleEvent(config.id, newDisabled)
    } finally {
      setTogglingEvent(null)
    }
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-4 h-4 text-secondary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Sender : <span className="font-mono text-primary">{config.sender}</span></p>
            <p className="text-xs text-foreground-muted">Créé le {new Date(config.created_at).toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-1.5 text-foreground-subtle hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
          title="Supprimer"
        >
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </div>

      {/* URL Webhook */}
      <div>
        <p className="text-xs font-medium text-foreground-subtle uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Link className="w-3 h-3" />
          URL à copier dans Chariow
        </p>
        <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-2.5 border border-border">
          <code className="text-xs text-secondary font-mono flex-1 truncate">{webhookUrl}</code>
          <button onClick={copyUrl} className="text-foreground-subtle hover:text-primary transition-colors shrink-0">
            {copied ? <Check className="w-3.5 h-3.5 text-secondary" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
        <p className="text-xs text-foreground-subtle mt-1">Chariow → Automation → Pulses → Nouvelle URL de pulse</p>
      </div>

      {/* Événements */}
      <div>
        <p className="text-xs font-medium text-foreground-subtle uppercase tracking-wider mb-2">Événements actifs</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {CHARIOW_EVENTS.map(({ value, label }) => {
            const isActive = !config.events_disabled.includes(value)
            const isToggling = togglingEvent === value
            return (
              <button
                key={value}
                onClick={() => toggleEvent(value)}
                disabled={!!togglingEvent}
                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                  isActive
                    ? 'border-secondary/30 bg-secondary/5 text-foreground'
                    : 'border-border bg-background text-foreground-subtle'
                }`}
              >
                <span>{label}</span>
                {isToggling
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin text-foreground-subtle" />
                  : isActive
                  ? <ToggleRight className="w-4 h-4 text-secondary shrink-0" />
                  : <ToggleLeft className="w-4 h-4 text-foreground-subtle shrink-0" />
                }
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// PAGE PRINCIPALE
// ============================================================

export default function TransactionnelPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [transactionalSenders, setTransactionalSenders] = useState<TransactionalSender[]>([])
  const [loading, setLoading] = useState(true)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyDefaultSender, setNewKeyDefaultSender] = useState('')
  const [creating, setCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'keys' | 'chariow' | 'docs'>('keys')

  // Chariow
  const [chariowConfigs, setChariowConfigs] = useState<ChariowConfig[]>([])
  const [chariowSender, setChariowSender] = useState('')
  const [creatingChariow, setCreatingChariow] = useState(false)
  const [showChariowForm, setShowChariowForm] = useState(false)
  const [chariowError, setChariowError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [keysRes, statsRes, sendersRes, chariowRes] = await Promise.all([
      fetch('/api/otp/keys'),
      fetch('/api/transactionnel/stats'),
      fetch('/api/senders'),
      fetch('/api/chariow/config'),
    ])
    if (keysRes.ok) setKeys((await keysRes.json()).keys)
    if (statsRes.ok) setStats(await statsRes.json())
    if (sendersRes.ok) {
      const data = await sendersRes.json()
      setTransactionalSenders(
        (data.senders || []).filter(
          (s: { statut: string; type_message: string | null }) =>
            s.statut === 'APPROVED' && ['TRANSACTIONAL', 'PROMOTIONAL'].includes(s.type_message ?? '')
        )
      )
    }
    if (chariowRes.ok) setChariowConfigs((await chariowRes.json()).configs || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const createKey = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!newKeyName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/otp/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName.trim(),
          default_transactional_sender: newKeyDefaultSender || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setKeys((prev) => [data.key, ...prev])
      setNewKeyName('')
      setNewKeyDefaultSender('')
      setShowCreateForm(false)
    } finally {
      setCreating(false)
    }
  }

  const removeKey = (id: string) => setKeys((prev) => prev.filter((k) => k.id !== id))
  const updateKey = (id: string, patch: Partial<ApiKey>) =>
    setKeys((prev) => prev.map((k) => k.id === id ? { ...k, ...patch } : k))

  const createChariow = async (e: React.FormEvent) => {
    e.preventDefault()
    setChariowError('')
    if (!chariowSender) return
    setCreatingChariow(true)
    try {
      const res = await fetch('/api/chariow/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: chariowSender }),
      })
      const data = await res.json()
      if (!res.ok) { setChariowError(data.error || 'Erreur'); return }
      setChariowConfigs((prev) => [data.config, ...prev])
      setChariowSender('')
      setShowChariowForm(false)
    } finally {
      setCreatingChariow(false)
    }
  }

  const removeChariow = (id: string) => setChariowConfigs((prev) => prev.filter((c) => c.id !== id))
  const updateChariowEvents = (id: string, events_disabled: string[]) =>
    setChariowConfigs((prev) => prev.map((c) => c.id === id ? { ...c, events_disabled } : c))

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* ---- En-tête ---- */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-5 h-5 text-secondary" />
          <h1 className="font-syne font-bold text-xl text-foreground">SMS Transactionnel</h1>
        </div>
        <p className="text-sm text-foreground-muted">
          Envoyez des SMS automatiques depuis vos applications : confirmations, notifications, alertes.
        </p>
      </div>

      {/* ---- Stats ---- */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total envoyés" value={stats.total} icon={Zap} color="bg-secondary/10 text-secondary" />
          <StatCard label="Ce mois" value={stats.thisMonth} icon={TrendingUp} color="bg-primary/10 text-primary" />
          <StatCard label="Délivrés" value={stats.delivered} icon={CheckCircle2} color="bg-secondary/10 text-secondary" />
          <StatCard label="Taux de livraison" value={`${stats.tauxLivraison}%`} icon={AlertCircle} color="bg-amber-500/10 text-amber-400" />
        </div>
      )}

      {/* ---- Tabs ---- */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 w-fit flex-wrap">
        {([
          { value: 'keys', label: 'Mes clés API', icon: <Key className="w-3.5 h-3.5" /> },
          { value: 'chariow', label: 'Chariow', icon: <ShoppingCart className="w-3.5 h-3.5" /> },
          { value: 'docs', label: 'Documentation', icon: <Code2 className="w-3.5 h-3.5" /> },
        ] as const).map(({ value, label, icon }) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === value ? 'bg-secondary text-[#0A0A0F]' : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {/* ---- Onglet : Clés API ---- */}
      {activeTab === 'keys' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-foreground-muted">
              {keys.length} clé(s) API · {5 - keys.length} emplacement(s) disponible(s)
            </p>
            {!showCreateForm && keys.length < 5 && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-secondary text-[#0A0A0F] rounded-lg text-sm font-semibold hover:bg-secondary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nouvelle clé
              </button>
            )}
          </div>

          {/* Formulaire création */}
          {showCreateForm && (
            <form onSubmit={createKey} className="bg-surface border border-secondary/30 rounded-xl p-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Nom de votre application</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Ex: Mon site e-commerce, App livraison..."
                  maxLength={50}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-secondary transition-colors"
                  autoFocus
                />
              </div>

              {transactionalSenders.length > 0 ? (
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">
                    Sender par défaut <span className="text-danger">*</span>
                  </label>
                  <select
                    value={newKeyDefaultSender}
                    onChange={(e) => setNewKeyDefaultSender(e.target.value)}
                    required
                    className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-secondary transition-colors"
                  >
                    <option value="">-- Sélectionner un sender --</option>
                    {transactionalSenders.map((s) => (
                      <option key={s.id} value={s.nom}>{s.nom}</option>
                    ))}
                  </select>
                  <p className="text-xs text-foreground-subtle mt-1">
                    Utilisé automatiquement si vous ne précisez pas <code className="text-secondary">sender</code> dans vos appels API.
                  </p>
                </div>
              ) : (
                <div className="bg-warning/8 border border-warning/20 rounded-lg px-4 py-3 text-xs text-warning">
                  Vous n&apos;avez aucun sender Transactionnel approuvé.{' '}
                  <a href="/senders" className="font-semibold underline hover:text-warning/80">
                    Créez et faites approuver un sender de type Transactionnel
                  </a>{' '}
                  avant de créer une clé API.
                </div>
              )}

              {error && <p className="text-xs text-danger">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={creating || !newKeyName.trim() || (transactionalSenders.length > 0 && !newKeyDefaultSender) || transactionalSenders.length === 0}
                  className="flex-1 py-2.5 bg-secondary text-[#0A0A0F] rounded-lg text-sm font-semibold hover:bg-secondary/90 disabled:opacity-50 transition-colors"
                >
                  {creating ? 'Création...' : 'Créer la clé'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreateForm(false); setError(''); setNewKeyDefaultSender('') }}
                  className="px-4 py-2.5 border border-border rounded-lg text-sm text-foreground-muted hover:text-foreground transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}

          {/* Liste des clés */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-surface border border-border rounded-xl p-4 animate-pulse">
                  <div className="h-4 w-32 bg-border rounded mb-3" />
                  <div className="h-8 w-full bg-border rounded" />
                </div>
              ))}
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <Key className="w-10 h-10 text-foreground-subtle mx-auto mb-3" />
              <p className="text-foreground-muted text-sm">Aucune clé API</p>
              <p className="text-foreground-subtle text-xs mt-1">
                Créez votre première clé pour commencer à utiliser l&apos;API SMS Transactionnel
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((k) => (
                <ApiKeyCard
                  key={k.id}
                  apiKey={k}
                  transactionalSenders={transactionalSenders}
                  onDelete={removeKey}
                  onUpdate={updateKey}
                />
              ))}
            </div>
          )}

          {/* Avertissement si aucun sender transactionnel */}
          {!loading && transactionalSenders.length === 0 && (
            <div className="flex items-start gap-3 bg-warning/8 border border-warning/20 rounded-xl px-4 py-3.5">
              <XCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-warning font-semibold">Aucun sender Transactionnel approuvé</p>
                <p className="text-xs text-warning/70 mt-0.5">
                  Vous devez créer et faire approuver un sender de type <strong>Transactionnel</strong> avant de pouvoir envoyer des SMS via l&apos;API.{' '}
                  <a href="/senders" className="underline font-semibold">Gérer mes senders →</a>
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- Onglet : Chariow ---- */}
      {activeTab === 'chariow' && (
        <div className="space-y-4">
          {/* Intro */}
          <div className="bg-surface border border-border rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-secondary" />
              <h3 className="font-syne font-semibold text-sm text-foreground">Intégration Chariow</h3>
            </div>
            <p className="text-xs text-foreground-muted">
              Recevez les pulses Chariow et envoyez automatiquement des SMS à vos clients.
              Chaque configuration génère une URL unique à coller dans Chariow → Automation → Pulses.
            </p>
          </div>

          {/* Avertissement si aucun sender */}
          {transactionalSenders.length === 0 && (
            <div className="flex items-start gap-3 bg-warning/8 border border-warning/20 rounded-xl px-4 py-3.5">
              <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-warning">
                Vous devez avoir un sender <strong>Transactionnel</strong> ou <strong>Promotionnel</strong> approuvé.{' '}
                <a href="/senders" className="underline font-semibold">Gérer mes senders →</a>
              </p>
            </div>
          )}

          {/* Bouton créer */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-foreground-muted">{chariowConfigs.length} intégration(s)</p>
            {!showChariowForm && transactionalSenders.length > 0 && (
              <button
                onClick={() => setShowChariowForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-secondary text-[#0A0A0F] rounded-lg text-sm font-semibold hover:bg-secondary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nouvelle intégration
              </button>
            )}
          </div>

          {/* Formulaire création */}
          {showChariowForm && (
            <form onSubmit={createChariow} className="bg-surface border border-secondary/30 rounded-xl p-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Sender à utiliser <span className="text-danger">*</span>
                </label>
                <select
                  value={chariowSender}
                  onChange={(e) => setChariowSender(e.target.value)}
                  required
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-secondary transition-colors"
                >
                  <option value="">-- Sélectionner un sender --</option>
                  {transactionalSenders.map((s) => (
                    <option key={s.id} value={s.nom}>{s.nom}</option>
                  ))}
                </select>
                <p className="text-xs text-foreground-subtle mt-1">
                  Ce sender sera utilisé pour tous les SMS envoyés via cette intégration.
                </p>
              </div>
              {chariowError && <p className="text-xs text-danger">{chariowError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={creatingChariow || !chariowSender}
                  className="flex-1 py-2.5 bg-secondary text-[#0A0A0F] rounded-lg text-sm font-semibold hover:bg-secondary/90 disabled:opacity-50 transition-colors"
                >
                  {creatingChariow ? 'Création...' : 'Créer l\'intégration'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowChariowForm(false); setChariowError(''); setChariowSender('') }}
                  className="px-4 py-2.5 border border-border rounded-lg text-sm text-foreground-muted hover:text-foreground transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}

          {/* Liste des configs */}
          {loading ? (
            <div className="bg-surface border border-border rounded-xl p-4 animate-pulse h-32" />
          ) : chariowConfigs.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <ShoppingCart className="w-10 h-10 text-foreground-subtle mx-auto mb-3" />
              <p className="text-foreground-muted text-sm">Aucune intégration Chariow</p>
              <p className="text-foreground-subtle text-xs mt-1">
                Créez une intégration pour envoyer des SMS automatiques depuis vos pulses Chariow
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {chariowConfigs.map((c) => (
                <ChariowCard
                  key={c.id}
                  config={c}
                  onDelete={removeChariow}
                  onToggleEvent={updateChariowEvents}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- Onglet : Documentation ---- */}
      {activeTab === 'docs' && (
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-syne font-semibold text-foreground">Comment ça fonctionne</h3>
            <ol className="space-y-2 text-sm text-foreground-muted list-decimal list-inside">
              <li>Créez un sender de type <strong className="text-foreground">Transactionnel</strong> et attendez son approbation</li>
              <li>Créez une clé API dans l&apos;onglet &quot;Mes clés API&quot; en sélectionnant ce sender</li>
              <li>Appelez <code className="text-secondary text-xs bg-secondary/10 px-1.5 py-0.5 rounded">POST /api/sms/public</code> depuis votre backend</li>
              <li>Recevez les accusés de livraison sur votre webhook DLR (optionnel)</li>
            </ol>
          </div>

          {/* Endpoint */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-3">
              <span className="text-xs font-bold bg-secondary/10 text-secondary px-2 py-0.5 rounded">POST</span>
              <code className="text-sm text-foreground">/api/sms/public</code>
              <span className="text-xs text-foreground-muted">Envoyer un SMS transactionnel</span>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-foreground-muted mb-2 font-medium uppercase tracking-wide">Requête</p>
                <pre className="bg-background rounded-lg p-4 text-xs text-foreground-muted overflow-x-auto font-mono">
{`curl -X POST https://votredomaine.com/api/sms/public \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: tp_live_votreclé" \\
  -d '{
    "to": "+2250700000001",
    "message": "Votre commande #1234 a été confirmée. Livraison prévue demain entre 9h et 12h.",
    "sender": "MONSHOP"
  }'`}
                </pre>
                <p className="text-xs text-foreground-muted mt-2">
                  Le champ <code className="text-secondary bg-secondary/10 px-1 rounded">sender</code> est optionnel si vous avez configuré un sender par défaut sur votre clé API.
                </p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted mb-2 font-medium uppercase tracking-wide">Réponse (succès)</p>
                <pre className="bg-background rounded-lg p-4 text-xs text-secondary overflow-x-auto font-mono">
{`{
  "success": true,
  "message": "SMS envoyé au +2250700000001",
  "message_id": "cm...",
  "cost_sms": 1
}`}
                </pre>
              </div>
            </div>
          </div>

          {/* Webhook DLR */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-3">
              <Globe className="w-4 h-4 text-secondary" />
              <span className="text-sm font-medium text-foreground">Webhook DLR — Accusés de livraison</span>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-foreground-muted">
                Configurez une URL sur votre clé API. TextoPro appellera cette URL à chaque changement de statut du SMS.
              </p>
              <div>
                <p className="text-xs text-foreground-muted mb-2 font-medium uppercase tracking-wide">Payload reçu sur votre webhook</p>
                <pre className="bg-background rounded-lg p-4 text-xs text-secondary overflow-x-auto font-mono">
{`{
  "message_id": "cm...",
  "letexto_id": "abc123",
  "status": "DELIVERED",
  "phone": "+2250700000001",
  "sender": "MONSHOP",
  "timestamp": "2026-06-29T10:30:00.000Z"
}`}
                </pre>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { status: 'PENDING', label: 'En attente', color: 'text-warning' },
                  { status: 'SENT', label: 'Envoyé réseau', color: 'text-primary' },
                  { status: 'DELIVERED', label: 'Délivré', color: 'text-secondary' },
                  { status: 'FAILED', label: 'Échec', color: 'text-danger' },
                ].map(({ status, label, color }) => (
                  <div key={status} className="bg-background border border-border rounded-lg p-2.5 text-center">
                    <code className={`font-mono font-bold ${color}`}>{status}</code>
                    <p className="text-foreground-subtle mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Infos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="font-medium text-foreground mb-1 text-sm">Longueur max</p>
              <p className="text-foreground-muted text-xs"><strong className="text-foreground">918 caractères</strong> (6 SMS). Coût calculé automatiquement.</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="font-medium text-foreground mb-1 text-sm">Coût</p>
              <p className="text-foreground-muted text-xs"><strong className="text-foreground">1 SMS</strong> ≤ 160 chars · +1 par tranche de 153 chars</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="font-medium text-foreground mb-1 text-sm">Authentification</p>
              <p className="text-foreground-muted text-xs">Header <code className="text-secondary">X-API-Key: tp_live_...</code></p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
