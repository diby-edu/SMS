'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { MessageSquare, Bell, Save, Loader2, Plus, Trash2, CreditCard } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { formatFCFA, fcfaToSMS } from '@/lib/utils'

interface AppConfig {
  id: string
  prix_sms_fcfa: number
  letexto_balance_alert: number
  montant_minimum: number
  montants_rapides: number[]
}

export default function AdminConfigPage() {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [form, setForm] = useState({
    prix_sms_fcfa: 30,
    letexto_balance_alert: 1000,
    montant_minimum: 500,
    montants_rapides: [1000, 3000, 5000, 10000, 25000, 50000],
  })
  const [newMontant, setNewMontant] = useState('')
  const [editingMontant, setEditingMontant] = useState<{ original: number; value: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/config')
      .then((r) => r.json())
      .then((d) => {
        if (d.config) {
          setConfig(d.config)
          setForm({
            prix_sms_fcfa: d.config.prix_sms_fcfa,
            letexto_balance_alert: d.config.letexto_balance_alert,
            montant_minimum: d.config.montant_minimum ?? 500,
            montants_rapides: Array.isArray(d.config.montants_rapides)
              ? d.config.montants_rapides
              : [1000, 3000, 5000, 10000, 25000, 50000],
          })
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.montants_rapides.length === 0) {
      toast.error('Ajoutez au moins un montant rapide')
      return
    }
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

  const addMontant = () => {
    const val = parseInt(newMontant)
    if (!val || val < 100) {
      toast.error('Montant invalide (minimum 100 FCFA)')
      return
    }
    if (form.montants_rapides.includes(val)) {
      toast.error('Ce montant est déjà dans la liste')
      return
    }
    if (form.montants_rapides.length >= 10) {
      toast.error('Maximum 10 montants rapides')
      return
    }
    setForm((p) => ({
      ...p,
      montants_rapides: [...p.montants_rapides, val].sort((a, b) => a - b),
    }))
    setNewMontant('')
  }

  const removeMontant = (val: number) => {
    setForm((p) => ({
      ...p,
      montants_rapides: p.montants_rapides.filter((m) => m !== val),
    }))
  }

  const startEditMontant = (val: number) => {
    setEditingMontant({ original: val, value: String(val) })
  }

  const confirmEditMontant = () => {
    if (!editingMontant) return
    const newVal = parseInt(editingMontant.value)
    if (!newVal || newVal < 100) {
      toast.error('Montant invalide (minimum 100 FCFA)')
      return
    }
    setForm((p) => ({
      ...p,
      montants_rapides: p.montants_rapides
        .map((m) => (m === editingMontant.original ? newVal : m))
        .sort((a, b) => a - b),
    }))
    setEditingMontant(null)
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

        {/* Recharge */}
        <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <CreditCard className="w-4 h-4 text-secondary" />
            <h3 className="font-syne font-semibold text-sm text-foreground">Recharge</h3>
          </div>

          <Input
            label="Montant minimum de recharge (FCFA)"
            type="number"
            min={100}
            max={100000}
            value={form.montant_minimum}
            onChange={(e) => setForm((p) => ({ ...p, montant_minimum: Number(e.target.value) }))}
            leftIcon={<CreditCard className="w-4 h-4" />}
            hint="Montant minimum qu'un client peut recharger"
          />

          {/* Montants rapides */}
          <div>
            <label className="label">Montants rapides affichés sur la page recharge</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {form.montants_rapides.map((val) => (
                editingMontant?.original === val ? (
                  <div key={val} className="flex items-center gap-1">
                    <input
                      type="number"
                      value={editingMontant.value}
                      onChange={(e) => setEditingMontant({ ...editingMontant, value: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') confirmEditMontant()
                        if (e.key === 'Escape') setEditingMontant(null)
                      }}
                      autoFocus
                      className="input py-1 text-xs w-28"
                    />
                    <button type="button" onClick={confirmEditMontant} className="text-xs text-secondary font-medium px-2 py-1 hover:underline">OK</button>
                    <button type="button" onClick={() => setEditingMontant(null)} className="text-xs text-foreground-subtle hover:text-foreground">✕</button>
                  </div>
                ) : (
                <div
                  key={val}
                  className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-medium group"
                >
                  <button
                    type="button"
                    onClick={() => startEditMontant(val)}
                    className="hover:text-primary transition-colors"
                  >
                    {val.toLocaleString('fr-FR')} FCFA
                  </button>
                  <button
                    type="button"
                    onClick={() => removeMontant(val)}
                    className="text-foreground-subtle hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                )
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                min={100}
                max={500000}
                placeholder="Ex: 7500"
                value={newMontant}
                onChange={(e) => setNewMontant(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMontant())}
                className="input flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addMontant}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Ajouter
              </Button>
            </div>
            <p className="text-xs text-foreground-subtle mt-1.5">
              Maximum 10 montants — triés automatiquement par ordre croissant
            </p>
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
