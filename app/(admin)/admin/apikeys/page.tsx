'use client'

import { useState, useEffect } from 'react'
import { Key, Copy, Check, Loader2, Power, PowerOff } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

interface ApiKey {
  id: string
  name: string
  key: string
  is_active: boolean
  last_used: string | null
  created_at: string
  _count: { otpCodes: number }
  user: { nom: string; prenom: string; email: string }
}

export default function AdminApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/apikeys')
      .then((r) => r.json())
      .then((d) => setKeys(d.keys || []))
      .finally(() => setLoading(false))
  }, [])

  const copyKey = async (id: string, key: string) => {
    await navigator.clipboard.writeText(key)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const toggleKey = async (id: string, currentActive: boolean) => {
    setTogglingId(id)
    try {
      const res = await fetch(`/api/admin/apikeys/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive }),
      })
      if (res.ok) {
        setKeys((prev) => prev.map((k) => k.id === id ? { ...k, is_active: !currentActive } : k))
      }
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="font-syne font-bold text-xl text-foreground">Clés API clients</h2>
        <p className="text-sm text-foreground-muted mt-0.5">
          Toutes les clés API OTP générées par vos clients
        </p>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : keys.length === 0 ? (
          <div className="py-16 text-center">
            <Key className="w-10 h-10 text-foreground-subtle mx-auto mb-3" />
            <p className="text-sm text-foreground-muted">Aucune clé API créée</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {keys.map((k) => (
              <div key={k.id} className="px-5 py-4 flex items-center gap-4 hover:bg-background/30 transition-colors">
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                  k.is_active ? 'bg-secondary/10 text-secondary' : 'bg-border text-foreground-muted'
                )}>
                  <Key className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{k.name}</p>
                    <span className={cn(
                      'badge border',
                      k.is_active
                        ? 'text-secondary bg-secondary/10 border-secondary/20'
                        : 'text-foreground-muted bg-border border-border'
                    )}>
                      {k.is_active ? 'Active' : 'Désactivée'}
                    </span>
                    <span className="text-xs text-foreground-subtle">{k._count.otpCodes} OTP</span>
                  </div>
                  <p className="text-xs text-foreground-muted mt-0.5">
                    {k.user.prenom} {k.user.nom} · {k.user.email}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-xs text-foreground-subtle font-mono truncate max-w-xs">
                      {k.key.slice(0, 20)}••••••
                    </code>
                    <button
                      onClick={() => copyKey(k.id, k.key)}
                      className="text-foreground-subtle hover:text-primary transition-colors"
                      title="Copier la clé"
                    >
                      {copiedId === k.id
                        ? <Check className="w-3.5 h-3.5 text-secondary" />
                        : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-xs text-foreground-subtle mt-0.5">
                    Créée le {formatDate(k.created_at)}
                    {k.last_used && ` · Dernière utilisation : ${formatDate(k.last_used)}`}
                  </p>
                </div>

                <button
                  onClick={() => toggleKey(k.id, k.is_active)}
                  disabled={togglingId === k.id}
                  title={k.is_active ? 'Désactiver' : 'Activer'}
                  className={cn(
                    'p-2 rounded-lg transition-colors disabled:opacity-50',
                    k.is_active
                      ? 'text-danger hover:bg-danger/10'
                      : 'text-secondary hover:bg-secondary/10'
                  )}
                >
                  {togglingId === k.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : k.is_active
                    ? <PowerOff className="w-4 h-4" />
                    : <Power className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
