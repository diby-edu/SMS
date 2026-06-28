'use client'

import { Suspense, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { XCircle } from 'lucide-react'
import Button from '@/components/ui/Button'

function CancelContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const called = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true
    const token = searchParams.get('token')
    if (token) {
      fetch('/api/recharge/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      }).catch(() => {})
    }
  }, [searchParams])

  return (
    <div className="text-center max-w-sm animate-fade-in">
      <div className="w-20 h-20 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-5">
        <XCircle className="w-10 h-10 text-danger" />
      </div>
      <h2 className="font-syne font-bold text-2xl text-foreground mb-2">
        Paiement annulé
      </h2>
      <p className="text-foreground-muted text-sm leading-relaxed mb-6">
        Votre paiement a été annulé.
        <br />
        Aucun montant n&apos;a été débité. Votre solde est inchangé.
      </p>
      <Button onClick={() => router.push('/recharge')}>
        Réessayer
      </Button>
    </div>
  )
}

export default function RechargeCancelPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Suspense fallback={null}>
        <CancelContent />
      </Suspense>
    </div>
  )
}
