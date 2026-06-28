'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck,
  Plus,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Key,
  Code2,
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Tag,
} from 'lucide-react'

// ============================================================
// TYPES
// ============================================================

interface ApiKey {
  id: string
  name: string
  key: string
  is_active: boolean
  default_otp_sender: string | null
  last_used: string | null
  created_at: string
  _count: { otpCodes: number }
}

interface Stats {
  total: number
  verified: number
  failed: number
  thisMonth: number
  tauxVerification: number
}

interface OtpSender {
  id: string
  nom: string
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

function ApiKeyRow({
  apiKey,
  otpSenders,
  onDelete,
  onUpdate,
}: {
  apiKey: ApiKey
  otpSenders: OtpSender[]
  onDelete: (id: string) => void
  onUpdate: (id: string, default_otp_sender: string | null) => void
}) {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editingSender, setEditingSender] = useState(false)
  const [selectedSender, setSelectedSender] = useState(apiKey.default_otp_sender ?? '')
  const [savingSender, setSavingSender] = useState(false)

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
        body: JSON.stringify({ default_otp_sender: selectedSender || null }),
      })
      if (res.ok) {
        onUpdate(apiKey.id, selectedSender || null)
        setEditingSender(false)
      }
    } finally {
      setSavingSender(false)
    }
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-medium text-foreground text-sm">{apiKey.name}</p>
          <p className="text-xs text-foreground-muted mt-0.5">
            {apiKey._count.otpCodes} OTP envoyé(s)
            {apiKey.last_used && (
              <> · Dernière utilisation : {new Date(apiKey.last_used).toLocaleDateString('fr-FR')}</>
            )}
          </p>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-1.5 text-foreground-subtle hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
          title="Supprimer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Clé API */}
      <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-2 border border-border">
        <Key className="w-3.5 h-3.5 text-foreground-subtle shrink-0" />
        <code className="text-xs text-foreground-muted font-mono flex-1 truncate">
          {visible ? apiKey.key : maskedKey}
        </code>
        <button
          onClick={() => setVisible(!visible)}
          className="text-foreground-subtle hover:text-foreground transition-colors"
        >
          {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={copyKey}
          className="text-foreground-subtle hover:text-primary transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-secondary" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Sender OTP par défaut */}
      {otpSenders.length > 0 && (
        <div className="mt-2">
          {editingSender ? (
            <div className="flex items-center gap-2">
              <select
                value={selectedSender}
                onChange={(e) => setSelectedSender(e.target.value)}
                className="flex-1 bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
              >
                <option value="">TextoPro (défaut système)</option>
                {otpSenders.map((s) => (
                  <option key={s.id} value={s.nom}>{s.nom}</option>
                ))}
              </select>
              <button
                onClick={saveSender}
                disabled={savingSender}
                className="text-xs text-secondary font-semibold hover:underline disabled:opacity-50"
              >
                {savingSender ? '...' : 'OK'}
              </button>
              <button
                onClick={() => { setEditingSender(false); setSelectedSender(apiKey.default_otp_sender ?? '') }}
                className="text-xs text-foreground-subtle hover:text-foreground"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-foreground-subtle">
              <Tag className="w-3 h-3" />
              <span>Sender OTP par défaut :</span>
              <span className="font-mono text-foreground font-medium">
                {apiKey.default_otp_sender ?? 'TextoPro'}
              </span>
              <button
                onClick={() => setEditingSender(true)}
                className="ml-1 text-primary hover:underline"
              >
                modifier
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function OtpSenderBadge({ nom }: { nom: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(nom)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="flex items-center justify-between bg-background border border-border rounded-lg px-3 py-2">
      <code className="text-sm font-mono text-foreground">{nom}</code>
      <button onClick={copy} className="text-foreground-subtle hover:text-primary transition-colors" title="Copier">
        {copied ? <Check className="w-3.5 h-3.5 text-secondary" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}

// ============================================================
// PAGE PRINCIPALE
// ============================================================

export default function OtpPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [otpSenders, setOtpSenders] = useState<OtpSender[]>([])
  const [loading, setLoading] = useState(true)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyDefaultSender, setNewKeyDefaultSender] = useState('')
  const [creating, setCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'keys' | 'docs'>('keys')

  const load = useCallback(async () => {
    setLoading(true)
    const [keysRes, statsRes, sendersRes] = await Promise.all([
      fetch('/api/otp/keys'),
      fetch('/api/otp/stats'),
      fetch('/api/senders'),
    ])
    if (keysRes.ok) setKeys((await keysRes.json()).keys)
    if (statsRes.ok) setStats(await statsRes.json())
    if (sendersRes.ok) {
      const data = await sendersRes.json()
      setOtpSenders(
        (data.senders || []).filter(
          (s: { statut: string; type_message: string | null }) =>
            s.statut === 'APPROVED' && s.type_message === 'OTP'
        )
      )
    }
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
          default_otp_sender: newKeyDefaultSender || null,
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

  const updateKey = (id: string, default_otp_sender: string | null) =>
    setKeys((prev) => prev.map((k) => k.id === id ? { ...k, default_otp_sender } : k))

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* ---- En-tête ---- */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h1 className="font-syne font-bold text-xl text-foreground">API &amp; Intégrations</h1>
          </div>
          <p className="text-sm text-foreground-muted">
            Intégrez l&apos;OTP et l&apos;envoi de SMS dans vos applications via l&apos;API TextoPro.
          </p>
        </div>
      </div>

      {/* ---- Stats ---- */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="OTP ce mois"
            value={stats.thisMonth}
            icon={TrendingUp}
            color="bg-primary/10 text-primary"
          />
          <StatCard
            label="Vérifiés"
            value={stats.verified}
            icon={CheckCircle2}
            color="bg-secondary/10 text-secondary"
          />
          <StatCard
            label="Échoués / Expirés"
            value={stats.failed}
            icon={XCircle}
            color="bg-danger/10 text-danger"
          />
          <StatCard
            label="Taux de succès"
            value={`${stats.tauxVerification}%`}
            icon={AlertCircle}
            color="bg-amber-500/10 text-amber-400"
          />
        </div>
      )}

      {/* ---- Tabs ---- */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('keys')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'keys'
              ? 'bg-primary text-[#0A0A0F]'
              : 'text-foreground-muted hover:text-foreground'
          }`}
        >
          <span className="flex items-center gap-2"><Key className="w-3.5 h-3.5" />Mes clés API</span>
        </button>
        <button
          onClick={() => setActiveTab('docs')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'docs'
              ? 'bg-primary text-[#0A0A0F]'
              : 'text-foreground-muted hover:text-foreground'
          }`}
        >
          <span className="flex items-center gap-2"><Code2 className="w-3.5 h-3.5" />Documentation</span>
        </button>
      </div>

      {/* ---- Onglet : Clés API ---- */}
      {activeTab === 'keys' && (
        <div className="space-y-4">
          {/* Bouton créer */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-foreground-muted">
              {keys.length} clé(s) API · {5 - keys.length} emplacement(s) disponible(s)
            </p>
            {!showCreateForm && keys.length < 5 && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-[#0A0A0F] rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nouvelle clé
              </button>
            )}
          </div>

          {/* Formulaire création */}
          {showCreateForm && (
            <form onSubmit={createKey} className="bg-surface border border-primary/30 rounded-xl p-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Nom de votre application</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Ex: Mon App Mobile, Site E-commerce..."
                  maxLength={50}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-primary transition-colors"
                  autoFocus
                />
              </div>
              {otpSenders.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">
                    Sender OTP par défaut
                    <span className="text-foreground-subtle font-normal ml-1">(optionnel)</span>
                  </label>
                  <select
                    value={newKeyDefaultSender}
                    onChange={(e) => setNewKeyDefaultSender(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                  >
                    <option value="">TextoPro (sender système par défaut)</option>
                    {otpSenders.map((s) => (
                      <option key={s.id} value={s.nom}>{s.nom}</option>
                    ))}
                  </select>
                  <p className="text-xs text-foreground-subtle mt-1">
                    Ce sender sera utilisé automatiquement si vous ne précisez pas le champ <code className="text-primary">sender</code> dans vos appels API.
                  </p>
                </div>
              )}
              {error && <p className="text-xs text-danger">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={creating || !newKeyName.trim()}
                  className="flex-1 py-2.5 bg-primary text-[#0A0A0F] rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
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
                Créez votre première clé pour commencer à utiliser l&apos;API OTP
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((k) => (
                <ApiKeyRow key={k.id} apiKey={k} otpSenders={otpSenders} onDelete={removeKey} onUpdate={updateKey} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- Senders OTP disponibles ---- */}
      {otpSenders.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-secondary" />
            <h3 className="font-syne font-semibold text-sm text-foreground">
              Vos senders OTP approuvés
            </h3>
          </div>
          <p className="text-xs text-foreground-muted">
            Utilisez le nom exact dans le paramètre <code className="text-primary bg-primary/10 px-1 py-0.5 rounded text-xs">sender</code> de votre requête API.
          </p>
          <div className="space-y-2">
            {otpSenders.map((s) => (
              <OtpSenderBadge key={s.id} nom={s.nom} />
            ))}
          </div>
        </div>
      )}

      {/* ---- Onglet : Documentation ---- */}
      {activeTab === 'docs' && (
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-syne font-semibold text-foreground">Comment ça fonctionne</h3>
            <ol className="space-y-2 text-sm text-foreground-muted list-decimal list-inside">
              <li>Créez une clé API dans l&apos;onglet &quot;Mes clés API&quot;</li>
              <li>Appelez <code className="text-primary text-xs bg-primary/10 px-1.5 py-0.5 rounded">POST /api/otp/send</code> pour envoyer un code à votre utilisateur</li>
              <li>Votre utilisateur saisit le code reçu par SMS</li>
              <li>Appelez <code className="text-primary text-xs bg-primary/10 px-1.5 py-0.5 rounded">POST /api/otp/verify</code> pour valider le code</li>
            </ol>
          </div>

          {/* Endpoint Send */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-3">
              <span className="text-xs font-bold bg-secondary/10 text-secondary px-2 py-0.5 rounded">POST</span>
              <code className="text-sm text-foreground">/api/otp/send</code>
              <span className="text-xs text-foreground-muted">Envoyer un code OTP</span>
            </div>
            <div className="p-5">
              <p className="text-xs text-foreground-muted mb-3 font-medium uppercase tracking-wide">Requête</p>
              <pre className="bg-background rounded-lg p-4 text-xs text-foreground-muted overflow-x-auto font-mono">
{`curl -X POST https://votredomaine.com/api/otp/send \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: tp_live_votreclé" \\
  -d '{"phone": "+2250700000001", "sender": "MONAPP"}'`}
              </pre>
              <div className="mt-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-xs text-foreground-muted">
                <span className="font-semibold text-foreground">sender</span> (optionnel) — nom de votre sender de type OTP approuvé.
                Si absent, un sender par défaut est utilisé.
              </div>
              <p className="text-xs text-foreground-muted mt-4 mb-3 font-medium uppercase tracking-wide">Réponse (succès)</p>
              <pre className="bg-background rounded-lg p-4 text-xs text-secondary overflow-x-auto font-mono">
{`{
  "success": true,
  "message": "Code OTP envoyé au +2250700000001",
  "expires_in": 300
}`}
              </pre>
            </div>
          </div>

          {/* Endpoint Verify */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-3">
              <span className="text-xs font-bold bg-secondary/10 text-secondary px-2 py-0.5 rounded">POST</span>
              <code className="text-sm text-foreground">/api/otp/verify</code>
              <span className="text-xs text-foreground-muted">Vérifier un code OTP</span>
            </div>
            <div className="p-5">
              <p className="text-xs text-foreground-muted mb-3 font-medium uppercase tracking-wide">Requête</p>
              <pre className="bg-background rounded-lg p-4 text-xs text-foreground-muted overflow-x-auto font-mono">
{`curl -X POST https://votredomaine.com/api/otp/verify \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: tp_live_votreclé" \\
  -d '{"phone": "+2250700000001", "code": "483921"}'`}
              </pre>
              <p className="text-xs text-foreground-muted mt-4 mb-3 font-medium uppercase tracking-wide">Réponse (succès)</p>
              <pre className="bg-background rounded-lg p-4 text-xs text-secondary overflow-x-auto font-mono">
{`{
  "success": true,
  "verified": true,
  "message": "Code vérifié avec succès"
}`}
              </pre>
            </div>
          </div>

          {/* Infos supplémentaires */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="font-medium text-foreground mb-1">Expiration</p>
              <p className="text-foreground-muted text-xs">Le code expire après <strong className="text-foreground">5 minutes</strong></p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="font-medium text-foreground mb-1">Tentatives</p>
              <p className="text-foreground-muted text-xs">Maximum <strong className="text-foreground">3 tentatives</strong> par code</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="font-medium text-foreground mb-1">Coût</p>
              <p className="text-foreground-muted text-xs"><strong className="text-foreground">1 SMS</strong> débité par OTP envoyé</p>
            </div>
          </div>

          {/* ---- Séparateur SMS API ---- */}
          <div className="border-t border-border pt-6">
            <h3 className="font-syne font-semibold text-foreground mb-4">API SMS — Envoi programmatique</h3>
            <p className="text-xs text-foreground-muted mb-4">
              Envoyez des SMS transactionnels ou promotionnels depuis vos applications via la même clé API.
              Le sender doit être de type <strong className="text-foreground">Transactionnel</strong> ou <strong className="text-foreground">Promotionnel</strong> et approuvé.
            </p>
          </div>

          {/* Endpoint SMS public */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-3">
              <span className="text-xs font-bold bg-secondary/10 text-secondary px-2 py-0.5 rounded">POST</span>
              <code className="text-sm text-foreground">/api/sms/public</code>
              <span className="text-xs text-foreground-muted">Envoyer un SMS</span>
            </div>
            <div className="p-5">
              <p className="text-xs text-foreground-muted mb-3 font-medium uppercase tracking-wide">Requête</p>
              <pre className="bg-background rounded-lg p-4 text-xs text-foreground-muted overflow-x-auto font-mono">
{`curl -X POST https://votredomaine.com/api/sms/public \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: tp_live_votreclé" \\
  -d '{
    "to": "+2250700000001",
    "message": "Votre commande #1234 a été expédiée.",
    "sender": "MONSENDER"
  }'`}
              </pre>
              <p className="text-xs text-foreground-muted mt-4 mb-3 font-medium uppercase tracking-wide">Réponse (succès)</p>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="font-medium text-foreground mb-1">Sender requis</p>
              <p className="text-foreground-muted text-xs">Sender approuvé de type <strong className="text-foreground">Transactionnel</strong> ou <strong className="text-foreground">Promotionnel</strong></p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="font-medium text-foreground mb-1">Longueur max</p>
              <p className="text-foreground-muted text-xs"><strong className="text-foreground">918 caractères</strong> (6 SMS). Coût calculé automatiquement.</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="font-medium text-foreground mb-1">Coût</p>
              <p className="text-foreground-muted text-xs"><strong className="text-foreground">1 SMS</strong> ≤ 160 chars, <strong className="text-foreground">+1</strong> par tranche de 153 chars</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
