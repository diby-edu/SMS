'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Settings, MessageSquare, Bell, Save, Loader2 } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { formatFCFA, fcfaToSMS } from '@/lib/utils'

interface AppConfig {
  id: string
  prix_sms_fcfa: number
  letexto_balance_alert: number
}

export default function AdminConfigPage() {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [form, setForm] = useState({ prix_sms_fcfa: 30, letexto_balance_alert: 1000 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/config')
      .then((r) => r.json())
      .then((d) => {
        if (d.config) {
          setConfig(d.config)
          setForm({ prix_sms_fcfa: d.config.prix_sms_fcfa, letexto_balance_alert: d.config.letexto_balance_alert })
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast.success('Configuration mise à jour')
      } else {
        toast.error('Erreur lors de la sauvegarde')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-lg space-y-6 animate-fade-in">
      <div>
        <h2 className="font-syne font-bold text-xl text-foreground">Configuration</h2>
        <p className="text-sm text-foreground-muted mt-0.5">
          Paramètres globaux de la plateforme TextoPro
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Prix SMS */}
        <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <MessageSquare className="w-4 h-4 text-primary" />
            <h3 className="font-syne font-semibold text-sm text-foreground">Tarification</h3>
          </div>

          <div>
            <Input
              label="Prix de vente d'un SMS (FCFA)"
              type="number"
              min={1}
              max={1000}
              value={form.prix_sms_fcfa}
              onChange={(e) => setForm((p) => ({ ...p, prix_sms_fcfa: Number(e.target.value) }))}
              leftIcon={<MessageSquare className="w-4 h-4" />}
              hint={`Exemple : 5 000 FCFA = ${fcfaToSMS(5000, form.prix_sms_fcfa)} SMS`}
            />
          </div>

          <div className="bg-background border border-border rounded-xl p-4 space-y-2">
            <p className="text-xs text-foreground-subtle font-medium uppercase tracking-wider">Simulation</p>
            {[1000, 5000, 10000, 50000].map((montant) => (
              <div key={montant} className="flex justify-between text-xs">
                <span className="text-foreground-muted">{formatFCFA(montant)}</span>
                <span className="text-foreground font-semibold">
                  = {fcfaToSMS(montant, form.prix_sms_fcfa).toLocaleString('fr-FR')} SMS
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Alerte solde LeTexto */}
        <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Bell className="w-4 h-4 text-warning" />
            <h3 className="font-syne font-semibold text-sm text-foreground">Alertes</h3>
          </div>

          <Input
            label="Seuil d'alerte solde LeTexto (en SMS)"
            type="number"
            min={0}
            value={form.letexto_balance_alert}
            onChange={(e) => setForm((p) => ({ ...p, letexto_balance_alert: Number(e.target.value) }))}
            leftIcon={<Bell className="w-4 h-4" />}
            hint="Une alerte s'affichera sur le dashboard admin quand le solde LeTexto est inférieur à ce seuil."
          />
        </div>

        <Button
          type="submit"
          loading={saving}
          fullWidth
          size="lg"
          leftIcon={<Save className="w-4 h-4" />}
        >
          Sauvegarder la configuration
        </Button>
      </form>
    </div>
  )
}
