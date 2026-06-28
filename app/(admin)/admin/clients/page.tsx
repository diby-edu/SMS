'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  Users, Search, ChevronLeft, ChevronRight,
  ToggleLeft, ToggleRight, Trash2, Loader2, MessageSquare, PlusCircle, X,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { cn, formatDate, COUNTRY_PHONE_PREFIXES } from '@/lib/utils'

interface Client {
  id: string; nom: string; prenom: string; email: string
  phone: string; pays: string; solde_sms: number
  is_active: boolean; created_at: string
  _count: { messages: number; campaigns: number; transactions: number }
}

const PAYS_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_PHONE_PREFIXES).map(([k, v]) => [k, v.name])
)

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  // Crédit manuel
  const [creditClientId, setCreditClientId] = useState<string | null>(null)
  const [creditSms, setCreditSms] = useState('')
  const [creditNote, setCreditNote] = useState('')
  const [crediting, setCrediting] = useState(false)

  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), ...(search && { search }) })
      const res = await fetch(`/api/admin/users?${params}`)
      const data = await res.json()
      setClients(data.users || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { fetchClients() }, [fetchClients])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const toggleActive = async (id: string, current: boolean) => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    if (res.ok) {
      setClients((prev) => prev.map((c) => c.id === id ? { ...c, is_active: !current } : c))
      toast.success(!current ? 'Compte activé' : 'Compte désactivé')
    }
  }

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Supprimer définitivement le compte de ${email} ? Cette action est irréversible.`)) return
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setClients((prev) => prev.filter((c) => c.id !== id))
      toast.success('Compte supprimé')
    }
  }

  const openCredit = (id: string) => {
    setCreditClientId(id)
    setCreditSms('')
    setCreditNote('')
  }

  const closeCredit = () => {
    setCreditClientId(null)
    setCreditSms('')
    setCreditNote('')
  }

  const handleCredit = async (clientId: string) => {
    const sms = parseInt(creditSms)
    if (!sms || sms < 1) { toast.error('Entrez un nombre de SMS valide'); return }
    setCrediting(true)
    try {
      const res = await fetch(`/api/admin/users/${clientId}/credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sms_credites: sms, note: creditNote || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Erreur lors du crédit'); return }
      setClients((prev) => prev.map((c) => c.id === clientId ? { ...c, solde_sms: data.nouveau_solde } : c))
      toast.success(`${sms} SMS crédités avec succès`)
      closeCredit()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setCrediting(false)
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-syne font-bold text-xl text-foreground">Clients</h2>
          <p className="text-sm text-foreground-muted mt-0.5">{total} client{total > 1 ? 's' : ''} enregistré{total > 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Recherche */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          type="text"
          placeholder="Rechercher par nom, email ou téléphone..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
          className="flex-1"
        />
        <Button type="submit" size="md">Rechercher</Button>
        {search && (
          <Button variant="secondary" onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}>
            Effacer
          </Button>
        )}
      </form>

      {/* Tableau */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : clients.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 text-foreground-subtle mx-auto mb-3" />
            <p className="text-sm text-foreground-muted">Aucun client trouvé</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {clients.map((client) => (
              <div key={client.id}>
                <div className="px-5 py-4 hover:bg-background/30 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                      {client.prenom.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">
                          {client.prenom} {client.nom}
                        </p>
                        <span className={cn('badge border', client.is_active ? 'text-secondary bg-secondary/10 border-secondary/20' : 'text-danger bg-danger/10 border-danger/20')}>
                          {client.is_active ? 'Actif' : 'Désactivé'}
                        </span>
                        <span className="badge bg-border text-foreground-muted">
                          {PAYS_LABELS[client.pays] || client.pays}
                        </span>
                      </div>
                      <p className="text-xs text-foreground-muted mt-0.5">{client.email} · {client.phone}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-foreground-subtle">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          <span className="text-primary font-semibold">{client.solde_sms}</span> SMS
                        </span>
                        <span>{client._count.messages} messages</span>
                        <span>{client._count.campaigns} campagnes</span>
                        <span>Inscrit {formatDate(client.created_at)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openCredit(client.id)}
                        className="p-2 rounded-lg text-foreground-subtle hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Créditer manuellement"
                      >
                        <PlusCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleActive(client.id, client.is_active)}
                        className={cn('p-2 rounded-lg transition-colors', client.is_active ? 'text-secondary hover:bg-secondary/10' : 'text-foreground-subtle hover:bg-border')}
                        title={client.is_active ? 'Désactiver' : 'Activer'}
                      >
                        {client.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => handleDelete(client.id, client.email)}
                        className="p-2 rounded-lg text-foreground-subtle hover:text-danger hover:bg-danger/8 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Formulaire crédit inline */}
                {creditClientId === client.id && (
                  <div className="px-5 pb-4 ml-13 animate-slide-up">
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">
                          Créditer manuellement — {client.prenom} {client.nom}
                        </p>
                        <button onClick={closeCredit} className="text-foreground-subtle hover:text-foreground">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-xs text-foreground-muted mb-1 block">Nombre de SMS à créditer</label>
                          <input
                            type="number"
                            min="1"
                            max="100000"
                            placeholder="Ex: 100"
                            value={creditSms}
                            onChange={(e) => setCreditSms(e.target.value)}
                            className="input w-full"
                            autoFocus
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-foreground-muted mb-1 block">Motif <span className="text-foreground-subtle">(optionnel)</span></label>
                          <input
                            type="text"
                            placeholder="Ex: Compensation, offre commerciale..."
                            value={creditNote}
                            onChange={(e) => setCreditNote(e.target.value)}
                            className="input w-full"
                            maxLength={200}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="secondary" size="sm" onClick={closeCredit}>Annuler</Button>
                        <Button
                          size="sm"
                          loading={crediting}
                          onClick={() => handleCredit(client.id)}
                          leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
                        >
                          Créditer {creditSms ? `${parseInt(creditSms) || 0} SMS` : ''}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-foreground-muted">Page {page} / {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1} leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}>Précédent</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>Suivant</Button>
          </div>
        </div>
      )}
    </div>
  )
}
