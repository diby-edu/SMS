'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Eye,
  EyeOff,
  MessageSquare,
  Lock,
  Mail,
  User,
  Phone,
  CheckCircle2,
} from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'


// ============================================================
// TYPES
// ============================================================

interface FormData {
  prenom: string
  nom: string
  email: string
  pays: string
  phone: string
  password: string
  confirmPassword: string
}

interface FormErrors {
  prenom?: string[]
  nom?: string[]
  email?: string[]
  pays?: string[]
  phone?: string[]
  password?: string[]
  confirmPassword?: string[]
  general?: string
}

// ============================================================
// INDICATEUR DE FORCE DU MOT DE PASSE
// ============================================================

function getPasswordStrength(password: string): {
  score: number
  label: string
  color: string
} {
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
// PAGE PRINCIPALE
// ============================================================

export default function RegisterPage() {
  const router = useRouter()

  const [form, setForm] = useState<FormData>({
    prenom: '',
    nom: '',
    email: '',
    pays: 'CI',
    phone: '',
    password: '',
    confirmPassword: '',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const passwordStrength = getPasswordStrength(form.password)

  const handleChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    // Effacer l'erreur du champ modifié
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!form.prenom.trim() || form.prenom.trim().length < 2)
      newErrors.prenom = ['Le prénom doit avoir au moins 2 caractères']
    if (!form.nom.trim() || form.nom.trim().length < 2)
      newErrors.nom = ['Le nom doit avoir au moins 2 caractères']
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = ['Adresse email invalide']
    if (!form.phone.trim() || form.phone.trim().length < 6)
      newErrors.phone = ['Numéro de téléphone invalide']
    if (!form.password || form.password.length < 8)
      newErrors.password = ['Le mot de passe doit avoir au moins 8 caractères']
    if (form.password !== form.confirmPassword)
      newErrors.confirmPassword = ['Les mots de passe ne correspondent pas']

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setErrors({})

    try {
      // Construire le numéro complet avec le préfixe Côte d'Ivoire
      const fullPhone = form.phone.startsWith('+')
        ? form.phone
        : `+225${form.phone.replace(/^0/, '')}`

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prenom: form.prenom.trim(),
          nom: form.nom.trim(),
          email: form.email.trim().toLowerCase(),
          pays: form.pays,
          phone: fullPhone,
          password: form.password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.errors) {
          setErrors(data.errors)
        } else {
          setErrors({ general: data.error || 'Une erreur est survenue' })
        }
        return
      }

      // Succès — afficher le message et rediriger
      setSuccess(true)
      setTimeout(() => router.push('/login'), 2500)
    } catch {
      setErrors({ general: 'Une erreur est survenue. Veuillez réessayer.' })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================
  // ÉTAT SUCCÈS
  // ============================================================

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-10 h-10 text-secondary" />
          </div>
          <h2 className="font-syne font-bold text-2xl text-foreground mb-2">
            Compte créé !
          </h2>
          <p className="text-foreground-muted text-sm leading-relaxed">
            Votre compte a été créé avec succès.
            <br />
            Redirection vers la connexion...
          </p>
        </div>
      </div>
    )
  }

  // ============================================================
  // FORMULAIRE
  // ============================================================

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 py-12">
      <div className="w-full max-w-[480px] animate-fade-in">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #00D4FF 0%, #10B981 100%)',
            }}
          >
            <MessageSquare className="w-5 h-5 text-[#0A0A0F]" />
          </div>
          <span className="font-syne font-bold text-xl text-foreground">
            TextoPro
          </span>
        </div>

        {/* En-tête */}
        <h1 className="font-syne font-bold text-2xl text-foreground mb-1">
          Créer un compte
        </h1>
        <p className="text-foreground-muted text-sm mb-8">
          Rejoignez TextoPro et commencez à envoyer vos SMS
        </p>

        {/* Carte formulaire */}
        <div className="bg-surface border border-border rounded-2xl p-6 md:p-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Prénom + Nom */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Prénom"
                type="text"
                placeholder="Kouadio"
                value={form.prenom}
                onChange={handleChange('prenom')}
                leftIcon={<User className="w-4 h-4" />}
                error={errors.prenom?.[0]}
                autoComplete="given-name"
                required
              />
              <Input
                label="Nom"
                type="text"
                placeholder="Konan"
                value={form.nom}
                onChange={handleChange('nom')}
                error={errors.nom?.[0]}
                autoComplete="family-name"
                required
              />
            </div>

            {/* Email */}
            <Input
              label="Adresse email"
              type="email"
              placeholder="kouadio@exemple.com"
              value={form.email}
              onChange={handleChange('email')}
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.[0]}
              autoComplete="email"
              required
            />

            {/* Téléphone */}
            <div>
              <label className="label">Téléphone</label>
              <div className="flex gap-2">
                {/* Indicatif fixe CI */}
                <div className="input flex items-center gap-1.5 px-3 shrink-0 cursor-default select-none text-sm text-foreground-muted w-[88px]">
                  <Phone className="w-3.5 h-3.5 text-foreground-subtle shrink-0" />
                  <span>+225</span>
                </div>

                {/* Champ téléphone */}
                <input
                  type="tel"
                  placeholder="07 00 00 00 00"
                  value={form.phone}
                  onChange={handleChange('phone')}
                  className={`input flex-1 ${errors.phone ? 'border-danger focus:border-danger focus:ring-danger/30' : ''}`}
                  autoComplete="tel"
                  required
                />
              </div>
              {errors.phone && (
                <p className="mt-1.5 text-xs text-danger flex items-center gap-1">
                  <span>⚠</span> {errors.phone[0]}
                </p>
              )}
              <p className="mt-1.5 text-xs text-foreground-subtle">
                Préfixe : +225 (Côte d&apos;Ivoire)
              </p>
            </div>

            {/* Mot de passe */}
            <div>
              <Input
                label="Mot de passe"
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 8 caractères"
                value={form.password}
                onChange={handleChange('password')}
                leftIcon={<Lock className="w-4 h-4" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-foreground-subtle hover:text-foreground-muted transition-colors p-0.5"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                }
                error={errors.password?.[0]}
                autoComplete="new-password"
                required
              />

              {/* Indicateur de force */}
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          i <= passwordStrength.score
                            ? passwordStrength.color
                            : 'bg-border'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-foreground-subtle">
                    Force :{' '}
                    <span
                      className={
                        passwordStrength.score <= 2
                          ? 'text-danger'
                          : passwordStrength.score <= 3
                          ? 'text-warning'
                          : 'text-secondary'
                      }
                    >
                      {passwordStrength.label}
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* Confirmation mot de passe */}
            <Input
              label="Confirmer le mot de passe"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Répétez votre mot de passe"
              value={form.confirmPassword}
              onChange={handleChange('confirmPassword')}
              leftIcon={<Lock className="w-4 h-4" />}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="text-foreground-subtle hover:text-foreground-muted transition-colors p-0.5"
                  tabIndex={-1}
                >
                  {showConfirm ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              }
              error={errors.confirmPassword?.[0]}
              autoComplete="new-password"
              required
            />

            {/* Erreur générale */}
            {errors.general && (
              <div className="flex items-start gap-2.5 bg-danger/8 border border-danger/20 rounded-lg px-4 py-3">
                <span className="text-danger text-sm mt-0.5 shrink-0">⚠</span>
                <p className="text-sm text-danger leading-relaxed">
                  {errors.general}
                </p>
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              fullWidth
              size="lg"
              className="mt-2"
            >
              Créer mon compte
            </Button>
          </form>
        </div>

        {/* Lien connexion */}
        <p className="mt-5 text-center text-sm text-foreground-muted">
          Déjà un compte ?{' '}
          <Link
            href="/login"
            className="text-primary hover:text-primary-hover font-medium transition-colors"
          >
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
