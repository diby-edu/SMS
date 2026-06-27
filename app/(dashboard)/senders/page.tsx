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
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { cn, formatDate, getStatusColor } from '@/lib/utils'

// ============================================================
// TYPES
// ============================================================

interface Sender {
  id: string
  nom: string
  statut: 'PENDING' | 'APPROVED' | 'REJECTED'
  created_at: string
}

const STATUT_CONFIG = {
  PENDING: {
    label: 'En attente',
    icon: Clock,
    color: 'text-warning bg-warning/10 border-warning/20',
    desc: 'Votre demande est en cours de validation par notre équipe.',
  },
  APPROVED: {
    label: 'Validé',
    icon: CheckCircle2,
    color: 'text-secondary bg-secondary/10 border-secondary/20',
    desc: 'Ce sender est actif et peut être utilisé pour vos envois.',
  },
  REJECTED: {
    label: 'Refusé',
    icon: XCircle,
    color: 'text-danger bg-danger/10 border-danger/20',
    desc: 'Ce sender a été refusé. Contactez le support pour plus d\'informations.',
  },
}

// ============================================================
// PAGE
// ============================================================

export default function SendersPage() {
  const [senders, setSenders] = useState<Sender[]>([])
  const [loading, setLoading] = useState(true)
  const [newNom, setNewNom] = useState('')
  const [nomError, setNomError] = useState('')
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

  useEffect(() => {
    fetchSenders()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setNomError('')

    const nom = newNom.trim()
    if (!nom) { setNomError('Nom requis'); return }
    if (nom.length < 2) { setNomError('Minimum 2 caractères'); return }
    if (nom.length > 11) { setNomError('Maximum 11 caractères'); return }
    if (!/^[a-zA-Z0-9\s\-]+$/.test(nom)) {
      setNomError('Lettres, chiffres, espaces et tirets uniquement')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/senders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom }),
      })
      const data = await res.json()

      if (!res.ok) {
        setNomError(data.errors?.nom?.[0] || data.error || 'Erreur lors de la création')
        return
      }

      toast.success('Demande de sender soumise. En attente de validation.')
      setNewNom('')
      setShowForm(false)
      setSenders((prev) => [data.sender, ...prev])
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
          <h2 className="font-syne font-bold text-xl text-foreground">
            Gestion des Senders
          </h2>
          <p className="text-sm text-foreground-muted mt-0.5">
            Nom d&apos;expéditeur affiché sur les SMS reçus par vos contacts
          </p>
        </div>
        <Button
          leftIcon={<Plus className="w-4 h-4" />}
          size="sm"
          onClick={() => setShowForm((v) => !v)}
        >
          Nouveau sender
        </Button>
      </div>

      {/* ---- Info ---- */}
      <div className="flex items-start gap-3 bg-primary/5 border border-primary/15 rounded-xl px-4 py-3.5">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-foreground-muted leading-relaxed">
          Un <strong className="text-foreground">Sender ID</strong> est le nom qui apparaît
          à la place du numéro sur les SMS de vos destinataires. Ex :{' '}
          <span className="font-mono text-primary">MonBusiness</span>.
          Chaque sender doit être validé par notre équipe avant utilisation (24-48h).
        </p>
      </div>

      {/* ---- Formulaire création ---- */}
      {showForm && (
        <div className="bg-surface border border-border rounded-2xl p-5 animate-slide-up">
          <h3 className="font-syne font-semibold text-sm text-foreground mb-4">
            Nouvelle demande de Sender
          </h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Nom du sender (max 11 caractères)"
              type="text"
              placeholder="Ex: MonShop"
              value={newNom}
              onChange={(e) => {
                setNewNom(e.target.value)
                if (nomError) setNomError('')
              }}
              maxLength={11}
              leftIcon={<Tag className="w-4 h-4" />}
              error={nomError}
              hint={`${newNom.length}/11 caractères · Lettres, chiffres, espaces, tirets`}
              autoFocus
            />
            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => { setShowForm(false); setNewNom(''); setNomError('') }}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button type="submit" loading={creating} className="flex-1">
                Soumettre la demande
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ---- Liste des senders ---- */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : senders.length === 0 ? (
          <div className="py-16 text-center">
            <Tag className="w-10 h-10 text-foreground-subtle mx-auto mb-3" />
            <p className="text-sm text-foreground-muted">Aucun sender créé</p>
            <p className="text-xs text-foreground-subtle mt-1">
              Créez un sender pour personnaliser vos envois SMS
            </p>
            <Button
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              className="mt-4"
              onClick={() => setShowForm(true)}
            >
              Créer un sender
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {senders.map((sender) => {
              const config = STATUT_CONFIG[sender.statut]
              const Icon = config.icon

              return (
                <div
                  key={sender.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-background/30 transition-colors"
                >
                  {/* Icône */}
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center border shrink-0',
                      config.color
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground font-mono">
                        {sender.nom}
                      </p>
                      <span
                        className={cn(
                          'badge border',
                          config.color
                        )}
                      >
                        {config.label}
                      </span>
                    </div>
                    <p className="text-xs text-foreground-subtle mt-0.5">
                      Créé le {formatDate(sender.created_at)}
                    </p>
                    {sender.statut !== 'APPROVED' && (
                      <p className="text-xs text-foreground-subtle mt-1 italic">
                        {config.desc}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
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
