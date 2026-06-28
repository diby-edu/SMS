'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { CheckCircle2, MessageSquare, Loader2 } from 'lucide-react'
import Button from '@/components/ui/Button'

function SuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { update } = useSession()
  const [smsCredites, setSmsCredites] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = searchParams.get('token')

    async function confirm() {
      if (token) {
        try {
          const res = await fetch('/api/recharge/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          })
          const data = await res.json()
          if (data.ok && data.sms_credites) {
            setSmsCredites(data.sms_credites)
          }
        } catch {
          // Silencieux — le webhook IPN aura peut-être déjà crédité
        }
      }
      // Rafraîchir le solde dans la session
      await update({ refreshSolde: true })
      setLoading(false)
    }

    confirm()
  }, [searchParams, update])

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="text-center max-w-sm animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-5">
          {loading ? (
            <Loader2 className="w-10 h-10 text-secondary animate-spin" />
          ) : (
            <CheckCircle2 className="w-10 h-10 text-secondary" />
          )}
        </div>

        <h2 className="font-syne font-bold text-2xl text-foreground mb-2">
          Paiement confirmé !
        </h2>
        <p className="text-foreground-muted text-sm leading-relaxed mb-6">
          Votre paiement a bien été reçu.
          <br />
          {smsCredites
            ? <span className="text-secondary font-semibold">+{smsCredites} SMS ajoutés à votre compte.</span>
            : 'Vos crédits SMS ont été ajoutés à votre compte.'
          }
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

export default function RechargeSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  )
}
