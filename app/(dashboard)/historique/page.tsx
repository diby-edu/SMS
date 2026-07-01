'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  History,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
  Eye,
  X,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import {
  cn,
  formatDate,
  truncate,
  getStatusColor,
  getMessageStatusLabel,
} from '@/lib/utils'

// ============================================================
// TYPES
// ============================================================

interface HistoryItem {
  id: string
  source: 'MARKETING' | 'CAMPAIGN' | 'TRANSACTIONNEL' | 'OTP'
  sender: string
  destinataire: string
  contenu: string
  statut: string
  cost_sms: number
  created_at: string
  nb_contacts?: number
  nb_success?: number
  nb_failed?: number
}

interface ApiResponse {
  items: HistoryItem[]
  total: number
  page: number
  totalPages: number
}

const STATUTS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'DELIVERED', label: 'Délivré' },
  { value: 'SENT', label: 'Envoyé' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'FAILED', label: 'Échoué' },
]

const TYPES = [
  { value: 'all', label: 'Tous les types' },
  { value: 'marketing', label: 'SMS Marketing' },
  { value: 'transactionnel', label: 'SMS Transactionnel' },
  { value: 'otp', label: 'OTP' },
]

// ============================================================
// PAGE
// ============================================================

export default function HistoriquePage() {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null)

  const [filters, setFilters] = useState({
    page: 1,
    type: 'all',
    statut: '',
    dateFrom: '',
    dateTo: '',
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(filters.page),
        type: filters.type,
        ...(filters.statut && { statut: filters.statut }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
      })

      const res = await fetch(`/api/historique?${params}`)
      const data: ApiResponse = await res.json()

      setItems(data.items)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const updateFilter = (key: keyof typeof filters, value: string | number) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }

  // ---- Export CSV ----
  const sourceLabel = (source: HistoryItem['source']) => {
    if (source === 'CAMPAIGN') return 'Campagne Marketing'
    if (source === 'TRANSACTIONNEL') return 'Transactionnel'
    if (source === 'OTP') return 'OTP'
    return 'SMS Marketing'
  }

  const sourceBadgeClass = (source: HistoryItem['source']) => {
    if (source === 'CAMPAIGN') return 'bg-secondary/10 text-secondary'
    if (source === 'TRANSACTIONNEL') return 'bg-[#10B981]/10 text-[#10B981]'
    if (source === 'OTP') return 'bg-warning/10 text-warning'
    return 'bg-primary/10 text-primary'
  }

  const exportCSV = () => {
    const headers = ['Date', 'Type', 'Expéditeur', 'Destinataire', 'Message', 'Statut', 'SMS']
    const rows = items.map((item) => [
      formatDate(item.created_at),
      sourceLabel(item.source),
      item.sender,
      item.destinataire,
      `"${item.contenu.replace(/"/g, '""')}"`,
      getMessageStatusLabel(item.statut),
      item.cost_sms,
    ])

    const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `historique-sms-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ---- Télécharger détails d'un item ----
  const downloadItemCSV = (item: HistoryItem) => {
    let csv: string
    const filename = `details-${item.id.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.csv`

    if (item.source === 'CAMPAIGN') {
      const headers = ['Campagne', 'Contacts', 'Livrés', 'Échoués', 'Statut']
      const row = [
        `"${item.destinataire.replace(/"/g, '""')}"`,
        item.nb_contacts ?? 0,
        item.nb_success ?? 0,
        item.nb_failed ?? 0,
        getMessageStatusLabel(item.statut),
      ]
      csv = [headers.join(';'), row.join(';')].join('\n')
    } else {
      const headers = ['Numéro', 'Statut']
      const row = [item.destinataire, getMessageStatusLabel(item.statut)]
      csv = [headers.join(';'), row.join(';')].join('\n')
    }

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // ============================================================
  // RENDU
  // ============================================================

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ---- En-tête ---- */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-syne font-bold text-xl text-foreground">
            Historique des envois
          </h2>
          <p className="text-sm text-foreground-muted mt-0.5">
            {total.toLocaleString('fr-FR')} envoi{total > 1 ? 's' : ''} au total
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Download className="w-3.5 h-3.5" />}
          onClick={exportCSV}
          disabled={items.length === 0}
        >
          Exporter CSV
        </Button>
      </div>

      {/* ---- Filtres ---- */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Type */}
          <div>
            <label className="label text-xs">Type</label>
            <select
              value={filters.type}
              onChange={(e) => updateFilter('type', e.target.value)}
              className="input text-sm"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Statut */}
          <div>
            <label className="label text-xs">Statut</label>
            <select
              value={filters.statut}
              onChange={(e) => updateFilter('statut', e.target.value)}
              className="input text-sm"
            >
              {STATUTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date début */}
          <div>
            <label className="label text-xs">Du</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => updateFilter('dateFrom', e.target.value)}
              className="input text-sm"
            />
          </div>

          {/* Date fin */}
          <div>
            <label className="label text-xs">Au</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => updateFilter('dateTo', e.target.value)}
              className="input text-sm"
            />
          </div>
        </div>

        {/* Réinitialiser */}
        {(filters.type !== 'all' || filters.statut || filters.dateFrom || filters.dateTo) && (
          <button
            onClick={() =>
              setFilters({ page: 1, type: 'all', statut: '', dateFrom: '', dateTo: '' })
            }
            className="mt-3 text-xs text-primary hover:text-primary-hover transition-colors"
          >
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* ---- Tableau ---- */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <History className="w-10 h-10 text-foreground-subtle mx-auto mb-3" />
            <p className="text-sm text-foreground-muted">Aucun résultat</p>
            <p className="text-xs text-foreground-subtle mt-1">
              Modifiez vos filtres ou envoyez votre premier SMS
            </p>
          </div>
        ) : (
          <>
            {/* Header tableau — desktop */}
            <div className="hidden md:grid grid-cols-[1fr_120px_1fr_100px_60px_60px] gap-4 px-4 py-3 border-b border-border text-xs text-foreground-subtle font-medium uppercase tracking-wider">
              <span>Date</span>
              <span>Type</span>
              <span>Expéditeur</span>
              <span>Statut</span>
              <span className="text-right">SMS</span>
              <span className="text-center">Actions</span>
            </div>

            {/* Lignes */}
            <div className="divide-y divide-border">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="px-4 py-3.5 hover:bg-background/50 transition-colors"
                >
                  {/* Mobile */}
                  <div className="md:hidden space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={cn('badge', sourceBadgeClass(item.source))}>
                        {sourceLabel(item.source)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={cn('badge', getStatusColor(item.statut))}>
                          {getMessageStatusLabel(item.statut)}
                        </span>
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-foreground-subtle">
                      {formatDate(item.created_at)} · {item.cost_sms} SMS · {item.sender}
                    </p>
                  </div>

                  {/* Desktop */}
                  <div className="hidden md:grid grid-cols-[1fr_120px_1fr_100px_60px_60px] gap-4 items-center">
                    <span className="text-xs text-foreground-muted">
                      {formatDate(item.created_at)}
                    </span>
                    <span className={cn('badge w-fit', sourceBadgeClass(item.source))}>
                      {sourceLabel(item.source)}
                    </span>
                    <span className="text-sm text-foreground truncate">
                      {item.sender}
                    </span>
                    <span className={cn('badge w-fit', getStatusColor(item.statut))}>
                      {getMessageStatusLabel(item.statut)}
                    </span>
                    <span className="text-sm text-foreground-muted text-right">
                      {item.cost_sms}
                    </span>
                    <div className="flex justify-center">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-colors"
                        title="Voir les détails"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ---- Modal Détails ---- */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header modal */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-syne font-bold text-base text-foreground">Détails</h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-muted hover:bg-border transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenu du message */}
            <div className="mb-4">
              <p className="text-xs text-foreground-subtle font-medium mb-1.5">Contenu du message</p>
              <div className="bg-background rounded-lg px-3 py-2.5 text-sm text-foreground leading-relaxed border border-border">
                {selectedItem.contenu}
              </div>
            </div>

            {/* Infos spécifiques selon le type */}
            {selectedItem.source === 'CAMPAIGN' ? (
              <div className="space-y-3 mb-5">
                <div>
                  <p className="text-xs text-foreground-subtle font-medium mb-1">Campagne</p>
                  <p className="text-sm text-foreground">{selectedItem.destinataire}</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-background rounded-lg px-3 py-2 text-center border border-border">
                    <p className="text-lg font-bold text-foreground">{selectedItem.nb_contacts ?? 0}</p>
                    <p className="text-xs text-foreground-subtle mt-0.5">Envoyés</p>
                  </div>
                  <div className="bg-background rounded-lg px-3 py-2 text-center border border-border">
                    <p className="text-lg font-bold text-[#10B981]">{selectedItem.nb_success ?? 0}</p>
                    <p className="text-xs text-foreground-subtle mt-0.5">Livrés</p>
                  </div>
                  <div className="bg-background rounded-lg px-3 py-2 text-center border border-border">
                    <p className="text-lg font-bold text-danger">{selectedItem.nb_failed ?? 0}</p>
                    <p className="text-xs text-foreground-subtle mt-0.5">Échoués</p>
                  </div>
                </div>
                <p className="text-xs text-foreground-subtle italic">
                  Le suivi individuel par numéro n&apos;est pas disponible pour les campagnes.
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-background rounded-lg px-3 py-2.5 border border-border mb-5">
                <div>
                  <p className="text-xs text-foreground-subtle font-medium mb-0.5">Destinataire</p>
                  <p className="text-sm text-foreground font-mono">{selectedItem.destinataire}</p>
                </div>
                <span className={cn('badge', getStatusColor(selectedItem.statut))}>
                  {getMessageStatusLabel(selectedItem.statut)}
                </span>
              </div>
            )}

            {/* Bouton download */}
            <button
              onClick={() => downloadItemCSV(selectedItem)}
              className="w-full flex items-center justify-center gap-2 bg-primary/10 text-primary hover:bg-primary/15 transition-colors rounded-xl px-4 py-2.5 text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Télécharger CSV
            </button>
          </div>
        </div>
      )}

      {/* ---- Pagination ---- */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-foreground-muted">
            Page {filters.page} sur {totalPages} · {total} résultat{total > 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => updateFilter('page', filters.page - 1)}
              disabled={filters.page <= 1}
              leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
            >
              Précédent
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => updateFilter('page', filters.page + 1)}
              disabled={filters.page >= totalPages}
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
