'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/ui/Button'

export default function RechargeSuccessPage() {
  const { update } = useSession()
  const router = useRouter()

  // Rafraîchir le solde depuis la DB
  useEffect(() => {
    update({ refreshSolde: true })
  }, [update])

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="text-center max-w-sm animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-10 h-10 text-secondary" />
        </div>

        <h2 className="font-syne font-bold text-2xl text-foreground mb-2">
          Paiement confirmé !
        </h2>
        <p className="text-foreground-muted text-sm leading-relaxed mb-6">
          Votre paiement a bien été reçu.
          <br />
          Vos crédits SMS ont été ajoutés à votre compte.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            leftIcon={<MessageSquare className="w-4 h-4" />}
            onClick={() => router.push('/sms')}
          >
            Envoyer un SMS
          </Button>
          <Button variant="secondary" onClick={() => router.push('/dashboard')}>
            Tableau de bord
          </Button>
        </div>
      </div>
    </div>
  )
}
