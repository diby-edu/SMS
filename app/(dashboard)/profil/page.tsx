'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Save,
  MessageSquare,
  Calendar,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { cn, formatDate, COUNTRY_PHONE_PREFIXES } from '@/lib/utils'

// ============================================================
// CONSTANTES
// ============================================================

const PAYS = Object.entries(COUNTRY_PHONE_PREFIXES).map(([code, { name, prefix }]) => ({
  code,
  name,
  prefix,
}))

// ============================================================
// INDICATEUR FORCE MOT DE PASSE
// ============================================================

function getPasswordStrength(password: string) {
  if (!password) return { score: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (score <= 1) return { score, label: 'Très faible', color: 'bg-danger' }
  if (score === 2) return { score, label: 'Faible', color: 'bg-warning' }
  if (score === 3) return { score, label: 'Moyen', color: 'bg-yellow-400' }
  if (score === 4) return { score, label: 'Fort', color: 'bg-secondary' }
  return { score, label: 'Très fort', color: 'bg-secondary' }
}

// ============================================================
// PAGE
// ============================================================

export default function ProfilPage() {
  const { data: session, update: updateSession } = useSession()

  // ---- Infos profil ----
  const [infoForm, setInfoForm] = useState({
    nom: '',
    prenom: '',
    phone: '',
    pays: 'CI',
  })
  const [infoErrors, setInfoErrors] = useState<Record<string, string>>({})
  const [savingInfo, setSavingInfo] = useState(false)
  const [infoSaved, setInfoSaved] = useState(false)

  // ---- Mot de passe ----
  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({})
  const [savingPw, setSavingPw] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // ---- Données serveur ----
  const [userEmail, setUserEmail] = useState('')
  const [userCreatedAt, setUserCreatedAt] = useState('')
  const [soldeSMS, setSoldeSMS] = useState(0)
  const [loadingProfile, setLoadingProfile] = useState(true)

  const pwStrength = getPasswordStrength(pwForm.newPassword)

  // ============================================================
  // CHARGEMENT
  // ============================================================

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          const u = data.user
          setInfoForm({ nom: u.nom, prenom: u.prenom, phone: u.phone, pays: u.pays })
          setUserEmail(u.email)
          setUserCreatedAt(u.created_at)
          setSoldeSMS(u.solde_sms)
        }
      })
      .catch(() => toast.error('Impossible de charger le profil'))
      .finally(() => setLoadingProfile(false))
  }, [])

  // ============================================================
  // MISE À JOUR INFOS
  // ============================================================

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    setInfoErrors({})
    setSavingInfo(true)
    setInfoSaved(false)

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(infoForm),
      })
      const data = await res.json()

      if (!res.ok) {
        const errs: Record<string, string> = {}
        if (data.errors) {
          Object.entries(data.errors).forEach(([k, v]) => {
            errs[k] = Array.isArray(v) ? v[0] : String(v)
          })
        }
        setInfoErrors(errs)
        return
      }

      // Mettre à jour la session NextAuth avec le nouveau nom
      await updateSession({
        name: `${data.user.prenom} ${data.user.nom}`,
      })

      toast.success('Profil mis à jour')
      setInfoSaved(true)
      setTimeout(() => setInfoSaved(false), 3000)
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSavingInfo(false)
    }
  }

  // ============================================================
  // CHANGEMENT MOT DE PASSE
  // ============================================================

  const handleSavePw = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwErrors({})

    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwErrors({ confirmPassword: 'Les mots de passe ne correspondent pas' })
      return
    }
    if (pwForm.newPassword.length < 8) {
      setPwErrors({ newPassword: 'Minimum 8 caractères' })
      return
    }

    setSavingPw(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: pwForm.currentPassword,
          newPassword: pwForm.newPassword,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        const errs: Record<string, string> = {}
        if (data.errors) {
          Object.entries(data.errors).forEach(([k, v]) => {
            errs[k] = Array.isArray(v) ? v[0] : String(v)
          })
        }
        setPwErrors(errs)
        return
      }

      toast.success('Mot de passe modifié avec succès')
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSavingPw(false)
    }
  }

  // ============================================================
  // RENDU
  // ============================================================

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const selectedPays = PAYS.find((p) => p.code === infoForm.pays)

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* ---- En-tête ---- */}
      <div>
        <h2 className="font-syne font-bold text-xl text-foreground">Mon profil</h2>
        <p className="text-sm text-foreground-muted mt-0.5">
          Gérez vos informations personnelles et votre sécurité
        </p>
      </div>

      {/* ---- Carte résumé ---- */}
      <div
        className="rounded-2xl p-5 flex items-center gap-5"
        style={{
          background: 'linear-gradient(135deg, rgba(0,212,255,0.06) 0%, rgba(16,185,129,0.06) 100%)',
          border: '1px solid rgba(0,212,255,0.12)',
        }}
      >
        {/* Avatar */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl text-[#0A0A0F] shrink-0"
          style={{ background: 'linear-gradient(135deg, #00D4FF 0%, #10B981 100%)' }}
        >
          {(infoForm.prenom || session?.user?.name || 'U').charAt(0).toUpperCase()}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <p className="font-syne font-bold text-lg text-foreground">
            {infoForm.prenom} {infoForm.nom}
          </p>
          <p className="text-sm text-foreground-muted truncate">{userEmail}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-foreground-subtle">
            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-primary" />
              <span className="text-primary font-semibold">{soldeSMS.toLocaleString('fr-FR')}</span> SMS
            </span>
            {userCreatedAt && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Membre depuis {formatDate(userCreatedAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================
          INFORMATIONS PERSONNELLES
          ================================================================ */}
      <div className="bg-surface border border-border rounded-2xl p-6">
        <h3 className="font-syne font-semibold text-base text-foreground mb-5">
          Informations personnelles
        </h3>

        <form onSubmit={handleSaveInfo} className="space-y-4">
          {/* Prénom + Nom */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Prénom"
              type="text"
              value={infoForm.prenom}
              onChange={(e) => setInfoForm((p) => ({ ...p, prenom: e.target.value }))}
              leftIcon={<User className="w-4 h-4" />}
              error={infoErrors.prenom}
              required
            />
            <Input
              label="Nom"
              type="text"
              value={infoForm.nom}
              onChange={(e) => setInfoForm((p) => ({ ...p, nom: e.target.value }))}
              error={infoErrors.nom}
              required
            />
          </div>

          {/* Email — lecture seule */}
          <div>
            <label className="label">Adresse email</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-subtle pointer-events-none">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={userEmail}
                disabled
                className="input pl-10 opacity-50 cursor-not-allowed"
              />
            </div>
            <p className="mt-1.5 text-xs text-foreground-subtle">
              L&apos;adresse email ne peut pas être modifiée
            </p>
          </div>

          {/* Pays + Téléphone */}
          <div>
            <label className="label">Téléphone</label>
            <div className="flex gap-2">
              <div className="relative">
                <select
                  value={infoForm.pays}
                  onChange={(e) => setInfoForm((p) => ({ ...p, pays: e.target.value }))}
                  className="input pr-8 pl-3 appearance-none cursor-pointer min-w-[145px]"
                >
                  {PAYS.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name} ({p.prefix})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-subtle pointer-events-none" />
              </div>
              <Input
                type="tel"
                placeholder="07 00 00 00 00"
                value={infoForm.phone}
                onChange={(e) => setInfoForm((p) => ({ ...p, phone: e.target.value }))}
                leftIcon={<Phone className="w-4 h-4" />}
                error={infoErrors.phone}
                className="flex-1"
              />
            </div>
            {selectedPays && (
              <p className="mt-1.5 text-xs text-foreground-subtle">
                Préfixe : {selectedPays.prefix} · {selectedPays.name}
              </p>
            )}
          </div>

          {/* Erreur générale */}
          {infoErrors.general && (
            <p className="text-sm text-danger">⚠ {infoErrors.general}</p>
          )}

          <Button
            type="submit"
            loading={savingInfo}
            leftIcon={
              infoSaved ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )
            }
            className={cn(infoSaved && 'bg-secondary hover:bg-secondary')}
          >
            {infoSaved ? 'Enregistré !' : 'Enregistrer les modifications'}
          </Button>
        </form>
      </div>

      {/* ================================================================
          CHANGER LE MOT DE PASSE
          ================================================================ */}
      <div className="bg-surface border border-border rounded-2xl p-6">
        <h3 className="font-syne font-semibold text-base text-foreground mb-5">
          Changer le mot de passe
        </h3>

        <form onSubmit={handleSavePw} className="space-y-4">
          {/* Mot de passe actuel */}
          <Input
            label="Mot de passe actuel"
            type={showCurrent ? 'text' : 'password'}
            placeholder="••••••••"
            value={pwForm.currentPassword}
            onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
            leftIcon={<Lock className="w-4 h-4" />}
            rightElement={
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="text-foreground-subtle hover:text-foreground-muted transition-colors p-0.5"
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            error={pwErrors.currentPassword}
            autoComplete="current-password"
            required
          />

          {/* Nouveau mot de passe */}
          <div>
            <Input
              label="Nouveau mot de passe"
              type={showNew ? 'text' : 'password'}
              placeholder="Minimum 8 caractères"
              value={pwForm.newPassword}
              onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
              leftIcon={<Lock className="w-4 h-4" />}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="text-foreground-subtle hover:text-foreground-muted transition-colors p-0.5"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              error={pwErrors.newPassword}
              autoComplete="new-password"
              required
            />

            {/* Indicateur force */}
            {pwForm.newPassword && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        i <= pwStrength.score ? pwStrength.color : 'bg-border'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-foreground-subtle">
                  Force :{' '}
                  <span
                    className={
                      pwStrength.score <= 2
                        ? 'text-danger'
                        : pwStrength.score <= 3
                        ? 'text-warning'
                        : 'text-secondary'
                    }
                  >
                    {pwStrength.label}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Confirmer */}
          <Input
            label="Confirmer le nouveau mot de passe"
            type={showConfirm ? 'text' : 'password'}
            placeholder="Répétez le nouveau mot de passe"
            value={pwForm.confirmPassword}
            onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
            leftIcon={<Lock className="w-4 h-4" />}
            rightElement={
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="text-foreground-subtle hover:text-foreground-muted transition-colors p-0.5"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            error={pwErrors.confirmPassword}
            autoComplete="new-password"
            required
          />

          <Button
            type="submit"
            loading={savingPw}
            variant="secondary"
            leftIcon={<Lock className="w-4 h-4" />}
          >
            Changer le mot de passe
          </Button>
        </form>
      </div>
    </div>
  )
}
