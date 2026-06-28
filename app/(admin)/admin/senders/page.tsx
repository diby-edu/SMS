'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  Tag, CheckCircle2, XCircle, Clock, Loader2, ChevronDown, ChevronUp, Download,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import { cn, formatDate, COUNTRY_PHONE_PREFIXES } from '@/lib/utils'

interface SenderAdmin {
  id: string
  nom: string
  statut: string
  type_message: string | null
  description: string | null
  email_contact: string | null
  site_web: string | null
  adresse: string | null
  siege_social: string | null
  exemple_message: string | null
  activite: string | null
  created_at: string
  user: { id: string; nom: string; prenom: string; email: string; pays: string }
}

const PAYS_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_PHONE_PREFIXES).map(([k, v]) => [k, v.name])
)

const TYPE_LABELS: Record<string, string> = {
  PROMOTIONAL: 'Promotionnel',
  OTP: 'OTP',
  TRANSACTIONAL: 'Transactionnel',
}

const TABS = [
  { value: 'PENDING', label: 'En attente', icon: Clock },
  { value: 'APPROVED', label: 'Actifs', icon: CheckCircle2 },
  { value: 'REJECTED', label: 'Désactivés', icon: XCircle },
]

export default function AdminSendersPage() {
  const [tab, setTab] = useState('PENDING')
  const [senders, setSenders] = useState<SenderAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
        toast.success(
          statut === 'APPROVED' ? 'Sender validé et activé' : 'Sender désactivé'
        )
      } else {
        toast.error('Erreur lors de la mise à jour')
      }
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="font-syne font-bold text-xl text-foreground">Gestion des Senders</h2>
        <p className="text-sm text-foreground-muted mt-0.5">
          Senders de vos clients — validez, désactivez ou réactivez
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
              <div key={sender.id} className="hover:bg-background/30 transition-colors">
                {/* Ligne principale */}
                <div className="px-5 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-border flex items-center justify-center shrink-0">
                    <Tag className="w-4 h-4 text-foreground-muted" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-foreground font-mono">{sender.nom}</p>
                      {sender.type_message && (
                        <span className="badge border border-border text-foreground-muted">
                          {TYPE_LABELS[sender.type_message] || sender.type_message}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-foreground-muted mt-0.5">
                      {sender.user.prenom} {sender.user.nom} · {sender.user.email}
                    </p>
                    <p className="text-xs text-foreground-subtle mt-0.5">
                      {PAYS_LABELS[sender.user.pays] || sender.user.pays} · {formatDate(sender.created_at)}
                      {sender.activite && ` · ${sender.activite}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Export CSV */}
                    <a
                      href={`/api/admin/senders/${sender.id}/export`}
                      download
                      title="Exporter les infos du sender (CSV pour LeTexto)"
                      className="text-foreground-subtle hover:text-primary transition-colors p-2 rounded-lg hover:bg-border"
                    >
                      <Download className="w-4 h-4" />
                    </a>

                    {/* Bouton détails */}
                    <button
                      onClick={() => setExpandedId(expandedId === sender.id ? null : sender.id)}
                      className="text-foreground-subtle hover:text-foreground transition-colors p-2 rounded-lg hover:bg-border"
                    >
                      {expandedId === sender.id
                        ? <ChevronUp className="w-4 h-4" />
                        : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {/* Actions */}
                    {tab === 'PENDING' && (
                      <>
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
                      </>
                    )}

                    {tab === 'APPROVED' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={processingId === sender.id}
                        onClick={() => handleAction(sender.id, 'REJECTED')}
                        className="text-danger hover:bg-danger/10"
                        leftIcon={<XCircle className="w-3.5 h-3.5" />}
                      >
                        Désactiver
                      </Button>
                    )}

                    {tab === 'REJECTED' && (
                      <Button
                        size="sm"
                        loading={processingId === sender.id}
                        onClick={() => handleAction(sender.id, 'APPROVED')}
                        leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      >
                        Réactiver
                      </Button>
                    )}
                  </div>
                </div>

                {/* Détails expandés */}
                {expandedId === sender.id && (
                  <div className="px-5 pb-4 ml-14 space-y-2 animate-slide-up">
                    <div className="bg-background border border-border rounded-xl p-4 space-y-3 text-xs">
                      {sender.description && (
                        <div>
                          <span className="text-foreground-subtle font-medium uppercase tracking-wider">Description</span>
                          <p className="text-foreground-muted mt-1">{sender.description}</p>
                        </div>
                      )}
                      {sender.email_contact && (
                        <div className="flex gap-4">
                          <div>
                            <span className="text-foreground-subtle font-medium uppercase tracking-wider">Email</span>
                            <p className="text-foreground-muted mt-1">{sender.email_contact}</p>
                          </div>
                          {sender.site_web && (
                            <div>
                              <span className="text-foreground-subtle font-medium uppercase tracking-wider">Site / App</span>
                              <p className="text-foreground-muted mt-1">{sender.site_web}</p>
                            </div>
                          )}
                        </div>
                      )}
                      {(sender.adresse || sender.siege_social) && (
                        <div className="flex gap-4">
                          {sender.adresse && (
                            <div>
                              <span className="text-foreground-subtle font-medium uppercase tracking-wider">Adresse</span>
                              <p className="text-foreground-muted mt-1">{sender.adresse}</p>
                            </div>
                          )}
                          {sender.siege_social && (
                            <div>
                              <span className="text-foreground-subtle font-medium uppercase tracking-wider">Siège social</span>
                              <p className="text-foreground-muted mt-1">{sender.siege_social}</p>
                            </div>
                          )}
                        </div>
                      )}
                      {sender.exemple_message && (
                        <div>
                          <span className="text-foreground-subtle font-medium uppercase tracking-wider">Exemples de message</span>
                          <p className="text-foreground-muted mt-1 whitespace-pre-wrap">{sender.exemple_message}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
