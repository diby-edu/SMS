import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn, formatRelativeDate, truncate, getStatusColor, getMessageStatusLabel } from '@/lib/utils'

interface RecentItem {
  id: string
  type: 'MESSAGE' | 'CAMPAIGN'
  destinataire: string  // numéro ou "X contacts"
  contenu: string
  statut: string
  sender: string
  created_at: Date | string
}

interface RecentActivityProps {
  items: RecentItem[]
}

export default function RecentActivity({ items }: RecentActivityProps) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-syne font-semibold text-sm text-foreground">
            Activité récente
          </h3>
          <p className="text-xs text-foreground-muted mt-0.5">
            Derniers envois
          </p>
        </div>
        <Link
          href="/historique"
          className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors font-medium"
        >
          Tout voir
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Liste */}
      {items.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-foreground-subtle">
            Aucun envoi pour le moment.
          </p>
          <Link
            href="/sms"
            className="mt-2 inline-block text-sm text-primary hover:text-primary-hover font-medium transition-colors"
          >
            Envoyer votre premier SMS
          </Link>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-background transition-colors group"
            >
              {/* Type badge */}
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                  item.type === 'CAMPAIGN'
                    ? 'bg-secondary/10 text-secondary'
                    : 'bg-primary/10 text-primary'
                )}
              >
                {item.type === 'CAMPAIGN' ? 'C' : 'S'}
              </div>

              {/* Contenu */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate font-medium">
                  {item.type === 'CAMPAIGN'
                    ? item.destinataire
                    : item.destinataire}
                </p>
                <p className="text-xs text-foreground-subtle truncate mt-0.5">
                  {truncate(item.contenu, 60)}
                </p>
              </div>

              {/* Statut + Date */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    getStatusColor(item.statut)
                  )}
                >
                  {getMessageStatusLabel(item.statut)}
                </span>
                <span className="text-xs text-foreground-subtle">
                  {formatRelativeDate(item.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
