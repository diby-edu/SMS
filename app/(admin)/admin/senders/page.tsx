'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Tag, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import { cn, formatDate, COUNTRY_PHONE_PREFIXES } from '@/lib/utils'

interface SenderAdmin {
  id: string; nom: string; statut: string; created_at: string
  user: { id: string; nom: string; prenom: string; email: string; pays: string }
}

const PAYS_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_PHONE_PREFIXES).map(([k, v]) => [k, v.name])
)

const TABS = [
  { value: 'PENDING', label: 'En attente', icon: Clock },
  { value: 'APPROVED', label: 'Validés', icon: CheckCircle2 },
  { value: 'REJECTED', label: 'Refusés', icon: XCircle },
]

export default function AdminSendersPage() {
  const [tab, setTab] = useState('PENDING')
  const [senders, setSenders] = useState<SenderAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/senders?statut=${tab}`)
      .then((r) => r.json())
      .then((d) => setSenders(d.senders || []))
      .finally(() => setLoading(false))
  }, [tab])

  const handleAction = async (id: string, statut: 'APPROVED' | 'REJECTED') => {
    setProcessingId(id)
    try {
      const res = await fetch(`/api/admin/senders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut }),
      })
      if (res.ok) {
        setSenders((prev) => prev.filter((s) => s.id !== id))
        toast.success(statut === 'APPROVED' ? 'Sender validé' : 'Sender refusé')
      }
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="font-syne font-bold text-xl text-foreground">Validation des Senders</h2>
        <p className="text-sm text-foreground-muted mt-0.5">
          Validez ou refusez les demandes de Sender ID de vos clients
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 w-fit">
        {TABS.map(({ value, label, icon: Icon }) => (
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
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : senders.length === 0 ? (
          <div className="py-16 text-center">
            <Tag className="w-10 h-10 text-foreground-subtle mx-auto mb-3" />
            <p className="text-sm text-foreground-muted">Aucun sender dans cette catégorie</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {senders.map((sender) => (
              <div key={sender.id} className="px-5 py-4 hover:bg-background/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-border flex items-center justify-center shrink-0">
                    <Tag className="w-4 h-4 text-foreground-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground font-mono">{sender.nom}</p>
                    <p className="text-xs text-foreground-muted mt-0.5">
                      {sender.user.prenom} {sender.user.nom} · {sender.user.email}
                    </p>
                    <p className="text-xs text-foreground-subtle mt-0.5">
                      {PAYS_LABELS[sender.user.pays] || sender.user.pays} · {formatDate(sender.created_at)}
                    </p>
                  </div>

                  {tab === 'PENDING' && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={processingId === sender.id}
                        onClick={() => handleAction(sender.id, 'REJECTED')}
                        className="text-danger hover:bg-danger/10"
                        leftIcon={<XCircle className="w-3.5 h-3.5" />}
                      >
                        Refuser
                      </Button>
                      <Button
                        size="sm"
                        loading={processingId === sender.id}
                        onClick={() => handleAction(sender.id, 'APPROVED')}
                        leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      >
                        Valider
                      </Button>
                    </div>
                  )}

                  {tab !== 'PENDING' && (
                    <span className={cn('badge border', tab === 'APPROVED' ? 'text-secondary bg-secondary/10 border-secondary/20' : 'text-danger bg-danger/10 border-danger/20')}>
                      {tab === 'APPROVED' ? 'Validé' : 'Refusé'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
