'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Eye,
  EyeOff,
  MessageSquare,
  Lock,
  Mail,
  CheckCircle2,
  BarChart3,
  Users,
  Globe,
} from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import type { Metadata } from 'next'

// Note: metadata ne fonctionne pas dans les Client Components.
// Elle est définie dans le layout ou via generateMetadata côté serveur.

const FEATURES = [
  { icon: MessageSquare, text: 'Envoi SMS unitaire et en masse' },
  { icon: BarChart3, text: 'Statistiques en temps réel' },
  { icon: Users, text: 'Gestion de contacts et listes' },
  { icon: Globe, text: 'Réseau Côte d\'Ivoire complet (Orange, MTN, Moov, Wave)' },
]

export default function LoginPage() {
  const router = useRouter()

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email: form.email.trim(),
        password: form.password,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
        return
      }

      // Redirection gérée par app/page.tsx selon le rôle
      router.push('/')
      router.refresh()
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* ======================================================
          PANNEAU GAUCHE — Branding (desktop uniquement)
          ====================================================== */}
      <div className="hidden lg:flex lg:w-[45%] bg-surface border-r border-border flex-col justify-between p-12 relative overflow-hidden">
        {/* Effet de lueur en haut */}
        <div
          className="absolute top-0 inset-x-0 h-64 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(0,212,255,0.12) 0%, transparent 70%)',
          }}
        />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
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

        {/* Contenu central */}
        <div className="relative z-10">
          <h2 className="font-syne font-bold text-4xl text-foreground leading-snug mb-4">
            La plateforme SMS
            <br />
            <span className="text-primary">professionnelle</span>
            <br />
            en Côte d&apos;Ivoire
          </h2>
          <p className="text-foreground-muted text-base mb-8 leading-relaxed">
            Envoyez vos campagnes SMS en quelques clics. Orange Money, MTN,
            Wave et plus pour recharger vos crédits.
          </p>

          <ul className="space-y-3.5">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-foreground-muted text-sm">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <p className="text-foreground-subtle text-xs relative z-10">
          © {new Date().getFullYear()} TextoPro. Tous droits réservés.
        </p>
      </div>

      {/* ======================================================
          PANNEAU DROIT — Formulaire
          ====================================================== */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[420px] animate-fade-in">
          {/* Logo mobile */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
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
            Bon retour
          </h1>
          <p className="text-foreground-muted text-sm mb-8">
            Connectez-vous à votre compte TextoPro
          </p>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="Adresse email"
              type="email"
              placeholder="vous@exemple.com"
              value={form.email}
              onChange={handleChange('email')}
              leftIcon={<Mail className="w-4 h-4" />}
              required
              autoComplete="email"
              autoFocus
            />

            <Input
              label="Mot de passe"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange('password')}
              leftIcon={<Lock className="w-4 h-4" />}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-foreground-subtle hover:text-foreground-muted transition-colors p-0.5"
                  tabIndex={-1}
                  aria-label={
                    showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
                  }
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              }
              required
              autoComplete="current-password"
            />

            {/* Message d'erreur */}
            {error && (
              <div className="flex items-start gap-2.5 bg-danger/8 border border-danger/20 rounded-lg px-4 py-3">
                <span className="text-danger text-sm mt-0.5 shrink-0">⚠</span>
                <p className="text-sm text-danger leading-relaxed">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              fullWidth
              size="lg"
              className="mt-2"
            >
              Se connecter
            </Button>
          </form>

          {/* Lien inscription */}
          <p className="mt-6 text-center text-sm text-foreground-muted">
            Pas encore de compte ?{' '}
            <Link
              href="/register"
              className="text-primary hover:text-primary-hover font-medium transition-colors"
            >
              Créer un compte gratuitement
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
