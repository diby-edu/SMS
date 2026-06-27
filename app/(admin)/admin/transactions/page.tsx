'use client'

import { useState, useEffect, useCallback } from 'react'
import { CreditCard, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import { cn, formatDate, formatFCFA, getStatusColor } from '@/lib/utils'

interface Transaction {
  id: string; montant_fcfa: number; sms_credites: number
  statut: string; created_at: string
  user: { nom: string; prenom: string; email: string }
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente', SUCCESS: 'Confirmé', FAILED: 'Échoué',
}

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/transactions?page=${page}`)
      const data = await res.json()
      setTransactions(data.transactions || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="font-syne font-bold text-xl text-foreground">Transactions</h2>
        <p className="text-sm text-foreground-muted mt-0.5">
          {total} transaction{total > 1 ? 's' : ''} au total
        </p>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center">
            <CreditCard className="w-10 h-10 text-foreground-subtle mx-auto mb-3" />
            <p className="text-sm text-foreground-muted">Aucune transaction</p>
          </div>
        ) : (
          <>
            <div className="hidden md:grid grid-cols-[1fr_1fr_120px_100px_80px] gap-4 px-5 py-3 border-b border-border text-xs text-foreground-subtle font-medium uppercase tracking-wider">
              <span>Client</span><span>Date</span><span>Montant</span><span>SMS</span><span>Statut</span>
            </div>
            <div className="divide-y divide-border">
              {transactions.map((tx) => (
                <div key={tx.id} className="px-5 py-3.5 hover:bg-background/30 transition-colors">
                  <div className="md:grid md:grid-cols-[1fr_1fr_120px_100px_80px] md:gap-4 md:items-center space-y-1 md:space-y-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{tx.user.prenom} {tx.user.nom}</p>
                      <p className="text-xs text-foreground-muted">{tx.user.email}</p>
                    </div>
                    <p className="text-xs text-foreground-muted">{formatDate(tx.created_at)}</p>
                    <p className="text-sm font-semibold text-foreground">{formatFCFA(tx.montant_fcfa)}</p>
                    <p className="text-sm text-primary font-semibold">+{tx.sms_credites.toLocaleString('fr-FR')}</p>
                    <span className={cn('badge w-fit', getStatusColor(tx.statut))}>
                      {STATUS_LABELS[tx.statut] || tx.statut}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

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
