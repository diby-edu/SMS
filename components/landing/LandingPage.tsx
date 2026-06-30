'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ──────────────────────────────────────────────────────────────
// Config
// ──────────────────────────────────────────────────────────────
const siteConfig = {
  name: 'TextoPro',
  url: 'https://sms.numerik360.com',
  whatsapp: '+2250554585927',
  stats: {
    clients: '500+',
    smsEnvoyes: '2M+',
    tauxDelivraison: '98%',
    pays: '8',
  },
  pricing: [
    { label: '10 000 SMS', price: 30, total: '300 000' },
    { label: '25 000 SMS', price: 28, total: '700 000' },
    { label: '50 000 SMS', price: 26, total: '1 300 000', popular: true },
    { label: '100 000 SMS', price: 24, total: '2 400 000' },
    { label: '500 000 SMS', price: 21, total: '10 500 000' },
    { label: '1 000 000 SMS', price: 20, total: '20 000 000' },
  ],
  faq: [
    {
      q: 'Comment démarrer avec TextoPro ?',
      a: "Créez un compte gratuitement, rechargez votre solde via Orange Money, MTN, Wave ou Moov, puis envoyez vos premiers SMS en quelques minutes. Aucune installation requise.",
    },
    {
      q: "Quels opérateurs sont couverts en Côte d'Ivoire ?",
      a: "TextoPro couvre Orange CI, MTN CI, Moov Africa, Wave et tous les réseaux mobiles en Côte d'Ivoire. Vos SMS sont délivrés quel que soit l'opérateur du destinataire.",
    },
    {
      q: "Comment fonctionne l'expéditeur personnalisé ?",
      a: "Vous pouvez envoyer des SMS avec votre nom de marque (ex: \"MonShop\") à la place d'un numéro. L'expéditeur doit être validé par les opérateurs télécom, ce qui prend généralement quelques jours.",
    },
    {
      q: "Qu'est-ce que le SMS Transactionnel via API ?",
      a: "L'API SMS Transactionnel vous permet d'envoyer des SMS automatiquement depuis votre application ou site web : confirmations de commande, alertes, notifications — sans passer par l'interface.",
    },
    {
      q: "Comment fonctionne l'OTP TextoPro ?",
      a: "L'API OTP génère et envoie automatiquement des codes de vérification à 6 chiffres, valables 5 minutes. Vous vérifiez ensuite le code avec un simple appel API.",
    },
    {
      q: 'Quels moyens de paiement sont acceptés ?',
      a: 'Orange Money, MTN Money, Wave, Moov Money et Free Money. Le rechargement est instantané.',
    },
  ],
}

// ──────────────────────────────────────────────────────────────
// FadeIn — scroll-triggered via IntersectionObserver
// ──────────────────────────────────────────────────────────────
function FadeIn({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '-60px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.6s ease ${delay}s, transform 0.6s cubic-bezier(.22,1,.36,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Navbar
// ──────────────────────────────────────────────────────────────
function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0A0A0F]/90 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold font-syne bg-gradient-to-r from-[#00D4FF] to-[#10B981] bg-clip-text text-transparent">
            Texto<span className="text-white">Pro</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {[
            ['Services', '#services'],
            ['Tarifs', '#tarifs'],
            ['API', '#api'],
            ['FAQ', '#faq'],
          ].map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              {label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-sm text-white/70 hover:text-white transition-colors px-4 py-2">
            Connexion
          </Link>
          <Link
            href="/register"
            className="text-sm font-medium bg-[#00D4FF] hover:bg-[#00C4EF] text-black px-4 py-2 rounded-lg transition-colors"
          >
            Commencer gratuitement
          </Link>
        </div>

        {/* Mobile burger */}
        <button
          className="md:hidden text-white/70 hover:text-white p-2"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          <div className="w-5 h-0.5 bg-current mb-1.5 transition-all" style={{ transform: open ? 'rotate(45deg) translate(0, 8px)' : '' }} />
          <div className="w-5 h-0.5 bg-current mb-1.5 transition-all" style={{ opacity: open ? 0 : 1 }} />
          <div className="w-5 h-0.5 bg-current transition-all" style={{ transform: open ? 'rotate(-45deg) translate(0, -8px)' : '' }} />
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className="md:hidden border-t border-white/5 bg-[#0A0A0F] overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? '300px' : '0' }}
      >
        <div className="px-4 py-4 flex flex-col gap-4">
          {[['Services', '#services'], ['Tarifs', '#tarifs'], ['API', '#api'], ['FAQ', '#faq']].map(([label, href]) => (
            <a key={label} href={href} className="text-white/70 hover:text-white" onClick={() => setOpen(false)}>
              {label}
            </a>
          ))}
          <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
            <Link href="/login" className="text-white/70 hover:text-white py-2">Connexion</Link>
            <Link href="/register" className="bg-[#00D4FF] text-black font-medium px-4 py-2 rounded-lg text-center">
              Commencer gratuitement
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

// ──────────────────────────────────────────────────────────────
// Hero
// ──────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#00D4FF]/8 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-[#10B981]/6 blur-[100px]" />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(0,212,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.5) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative mx-auto max-w-5xl px-4 text-center">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#00D4FF]/20 bg-[#00D4FF]/5 text-[#00D4FF] text-xs font-medium mb-6"
          style={{ animation: 'fadeSlideUp 0.5s ease both' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#00D4FF] animate-pulse" />
          Plateforme SMS N°1 en Côte d'Ivoire
        </div>

        <h1
          className="text-4xl sm:text-5xl md:text-6xl font-bold font-syne text-white leading-tight mb-6"
          style={{ animation: 'fadeSlideUp 0.6s ease both', animationDelay: '0.1s' }}
        >
          Envoyez des SMS professionnels{' '}
          <span className="bg-gradient-to-r from-[#00D4FF] to-[#10B981] bg-clip-text text-transparent">
            en Côte d'Ivoire
          </span>
        </h1>

        <p
          className="text-lg text-white/60 max-w-2xl mx-auto mb-10"
          style={{ animation: 'fadeSlideUp 0.6s ease both', animationDelay: '0.2s' }}
        >
          SMS promotionnels, notifications automatiques et OTP — une seule plateforme pour toute votre communication mobile. Dès 20 FCFA/SMS.
        </p>

        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          style={{ animation: 'fadeSlideUp 0.6s ease both', animationDelay: '0.3s' }}
        >
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#00D4FF] hover:bg-[#00C4EF] text-black font-semibold px-8 py-3.5 rounded-xl transition-all hover:scale-105 text-base"
          >
            Créer un compte gratuit
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <a
            href="#services"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/30 text-white/70 hover:text-white px-8 py-3.5 rounded-xl transition-all text-base"
          >
            Voir les services
          </a>
        </div>

        {/* Stats */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto"
          style={{ animation: 'fadeSlideUp 0.6s ease both', animationDelay: '0.4s' }}
        >
          {[
            { value: siteConfig.stats.clients, label: 'Clients actifs' },
            { value: siteConfig.stats.smsEnvoyes, label: 'SMS envoyés' },
            { value: siteConfig.stats.tauxDelivraison, label: 'Taux de livraison' },
            { value: siteConfig.stats.pays, label: 'Pays couverts' },
          ].map(({ value, label }) => (
            <div key={label} className="p-4 rounded-xl border border-white/5 bg-white/2">
              <div className="text-2xl font-bold font-syne text-[#00D4FF]">{value}</div>
              <div className="text-sm text-white/50 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ──────────────────────────────────────────────────────────────
// Services
// ──────────────────────────────────────────────────────────────
function Services() {
  const services = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      ),
      color: '#00D4FF',
      tag: 'PRIORITAIRE',
      title: 'SMS Promotionnel',
      description: "Envoyez des campagnes SMS en masse à vos clients. Interface intuitive, expéditeur personnalisé, ciblage par listes de contacts et suivi en temps réel.",
      features: ['Envoi en masse illimité', 'Expéditeur personnalisé (marque)', 'Gestion des listes de contacts', 'Statistiques de livraison', 'Programmation des campagnes'],
      cta: 'Lancer une campagne',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: '#10B981',
      tag: 'API REST',
      title: 'SMS Transactionnel',
      description: "Intégrez l'envoi de SMS dans votre application via une API simple. Confirmations de commande, alertes, notifications automatiques — déclenchés par vos événements.",
      features: ['API REST simple (une clé suffit)', 'Intégration Chariow (webhooks)', 'Logs détaillés par clé API', 'Plusieurs clés par compte', 'Déclenchement par événement'],
      cta: 'Voir la documentation',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 12c0 4.214 2.175 7.916 5.449 10.048a11.95 11.95 0 003.001 1.378" />
        </svg>
      ),
      color: '#F59E0B',
      tag: 'SÉCURITÉ',
      title: 'OTP par SMS',
      description: "Sécurisez les connexions et validez les transactions de vos utilisateurs avec des codes OTP à usage unique, envoyés par SMS et vérifiés via API.",
      features: ['Code à 6 chiffres, valable 5 min', 'Vérification via API', 'Gestion des tentatives', 'Logs de vérification', 'Multi-clés API'],
      cta: "Tester l'OTP",
    },
  ]

  return (
    <section id="services" className="py-24 px-4">
      <div className="mx-auto max-w-6xl">
        <FadeIn className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/50 text-xs font-medium mb-4">
            NOS SERVICES
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold font-syne text-white mb-4">
            Tout ce dont votre entreprise a besoin
          </h2>
          <p className="text-white/50 max-w-xl mx-auto">
            Une plateforme complète pour tous vos besoins SMS : marketing, automatisation et authentification.
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-6">
          {services.map((service, i) => (
            <FadeIn key={service.title} delay={i * 0.1}>
              <div className="relative h-full rounded-2xl border border-white/8 bg-white/2 p-6 hover:border-white/15 transition-all group">
                {service.tag && (
                  <div
                    className="absolute -top-3 left-6 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider"
                    style={{ background: service.color, color: '#000' }}
                  >
                    {service.tag}
                  </div>
                )}

                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: `${service.color}20`, color: service.color }}
                >
                  {service.icon}
                </div>

                <h3 className="text-xl font-bold font-syne text-white mb-3">{service.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed mb-5">{service.description}</p>

                <ul className="space-y-2 mb-6">
                  {service.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-white/60">
                      <svg className="w-4 h-4 flex-shrink-0" style={{ color: service.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors group-hover:gap-2.5"
                  style={{ color: service.color }}
                >
                  {service.cta}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

// ──────────────────────────────────────────────────────────────
// How it works
// ──────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { num: '01', title: 'Créez votre compte', desc: 'Inscription gratuite en 2 minutes. Aucune carte bancaire requise pour démarrer.' },
    { num: '02', title: 'Rechargez votre solde', desc: 'Payez via Orange Money, MTN, Wave ou Moov. Le rechargement est instantané.' },
    { num: '03', title: 'Configurez votre expéditeur', desc: "Demandez votre nom d'expéditeur (marque). Validation par les opérateurs en quelques jours." },
    { num: '04', title: 'Envoyez vos SMS', desc: "Lancez vos campagnes, utilisez l'API ou activez les webhooks automatiques. C'est tout." },
  ]

  return (
    <section className="py-24 px-4 bg-white/[0.01] border-y border-white/5">
      <div className="mx-auto max-w-6xl">
        <FadeIn className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/50 text-xs font-medium mb-4">
            DÉMARRAGE RAPIDE
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold font-syne text-white mb-4">
            Opérationnel en moins de 10 minutes
          </h2>
          <p className="text-white/50 max-w-xl mx-auto">
            Une plateforme simple pensée pour les entreprises africaines.
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <FadeIn key={step.num} delay={i * 0.1}>
              <div className="relative text-center p-6">
                <div className="w-14 h-14 rounded-2xl border border-[#00D4FF]/30 bg-[#00D4FF]/5 flex items-center justify-center mx-auto mb-4">
                  <span className="text-[#00D4FF] font-bold font-syne text-lg">{step.num}</span>
                </div>
                <h3 className="font-semibold font-syne text-white mb-2">{step.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{step.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

// ──────────────────────────────────────────────────────────────
// Pricing
// ──────────────────────────────────────────────────────────────
function Pricing() {
  return (
    <section id="tarifs" className="py-24 px-4">
      <div className="mx-auto max-w-6xl">
        <FadeIn className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/50 text-xs font-medium mb-4">
            TARIFS TRANSPARENTS
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold font-syne text-white mb-4">
            Plus vous envoyez, moins vous payez
          </h2>
          <p className="text-white/50 max-w-xl mx-auto">
            Tarifs en FCFA. Rechargez le volume qui vous convient, sans abonnement ni engagement.
          </p>
        </FadeIn>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {siteConfig.pricing.map((tier, i) => (
            <FadeIn key={tier.label} delay={i * 0.07}>
              <div
                className={`relative rounded-2xl border p-6 transition-all hover:scale-[1.02] ${
                  tier.popular
                    ? 'border-[#00D4FF]/40 bg-[#00D4FF]/5'
                    : 'border-white/8 bg-white/2 hover:border-white/15'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#00D4FF] text-black text-[10px] font-bold tracking-wider">
                    PLUS POPULAIRE
                  </div>
                )}
                <div className="text-white/60 text-sm mb-3">{tier.label}</div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className={`text-4xl font-bold font-syne ${tier.popular ? 'text-[#00D4FF]' : 'text-white'}`}>
                    {tier.price}
                  </span>
                  <span className="text-white/50 text-sm">FCFA/SMS</span>
                </div>
                <div className="text-white/30 text-xs mb-5">Soit {tier.total} FCFA au total</div>
                <Link
                  href="/register"
                  className={`block w-full text-center py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    tier.popular
                      ? 'bg-[#00D4FF] hover:bg-[#00C4EF] text-black'
                      : 'border border-white/10 hover:border-white/25 text-white/70 hover:text-white'
                  }`}
                >
                  Choisir ce pack
                </Link>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.3} className="mt-8 text-center">
          <p className="text-white/40 text-sm">
            Volume supérieur à 1M de SMS ?{' '}
            <a
              href={`https://wa.me/${siteConfig.whatsapp.replace('+', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#10B981] hover:underline"
            >
              Contactez-nous pour un devis personnalisé
            </a>
          </p>
        </FadeIn>
      </div>
    </section>
  )
}

// ──────────────────────────────────────────────────────────────
// Code Preview
// ──────────────────────────────────────────────────────────────
function CodePreview() {
  const [copied, setCopied] = useState(false)

  const code = `curl -X POST https://sms.numerik360.com/api/sms/public \\
  -H "Authorization: Bearer tp_live_VOTRE_CLE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "+2250700000000",
    "message": "Votre commande #1234 a été confirmée."
  }'

# Réponse
{
  "success": true,
  "messageId": "msg_abc123",
  "status": "SENT"
}`

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section id="api" className="py-24 px-4 bg-white/[0.01] border-y border-white/5">
      <div className="mx-auto max-w-6xl">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <FadeIn>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/50 text-xs font-medium mb-4">
              INTÉGRATION API
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold font-syne text-white mb-5">
              Une API en quelques lignes de code
            </h2>
            <p className="text-white/50 leading-relaxed mb-6">
              Intégrez l'envoi de SMS dans votre application en quelques minutes. Notre API REST est simple, bien documentée et compatible avec tous les langages.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                'Authentification par clé Bearer',
                'Réponse JSON instantanée',
                'Webhooks Chariow inclus',
                'Logs détaillés dans le dashboard',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-white/60 text-sm">
                  <span className="w-5 h-5 rounded-full bg-[#10B981]/15 text-[#10B981] flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-[#10B981] hover:bg-[#0EA572] text-white font-medium px-6 py-3 rounded-xl transition-colors text-sm"
            >
              Obtenir ma clé API
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="rounded-2xl border border-white/10 bg-[#0D0D14] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <button
                  onClick={handleCopy}
                  className="text-white/30 hover:text-white/70 text-xs flex items-center gap-1.5 transition-colors"
                >
                  {copied ? (
                    <span className="text-[#10B981]">Copié !</span>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copier
                    </>
                  )}
                </button>
              </div>

              <pre className="p-5 text-xs leading-relaxed overflow-x-auto">
                <code>
                  {code.split('\n').map((line, i) => {
                    let color = '#94A3B8'
                    if (line.startsWith('#')) color = '#475569'
                    else if (line.includes('curl') || line.startsWith('  -')) color = '#00D4FF'
                    else if (line.includes('"success"') || line.includes('"messageId"') || line.includes('"status"')) color = '#10B981'
                    return <span key={i} style={{ color, display: 'block' }}>{line || ' '}</span>
                  })}
                </code>
              </pre>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}

// ──────────────────────────────────────────────────────────────
// FAQ
// ──────────────────────────────────────────────────────────────
function FAQ() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section id="faq" className="py-24 px-4">
      <div className="mx-auto max-w-3xl">
        <FadeIn className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/50 text-xs font-medium mb-4">
            FAQ
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold font-syne text-white mb-4">
            Questions fréquentes
          </h2>
          <p className="text-white/50">Vous ne trouvez pas votre réponse ? Contactez-nous sur WhatsApp.</p>
        </FadeIn>

        <div className="space-y-3">
          {siteConfig.faq.map((item, i) => (
            <FadeIn key={i} delay={i * 0.05}>
              <div className="rounded-xl border border-white/8 bg-white/2 overflow-hidden">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="font-medium text-white pr-4">{item.q}</span>
                  <div
                    className="flex-shrink-0 w-5 h-5 text-white/40"
                    style={{ transform: open === i ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
                  >
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </button>
                <div
                  style={{
                    maxHeight: open === i ? '400px' : '0',
                    overflow: 'hidden',
                    transition: 'max-height 0.25s ease',
                  }}
                >
                  <p className="px-5 pb-4 text-white/50 text-sm leading-relaxed">{item.a}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

// ──────────────────────────────────────────────────────────────
// CTA Final
// ──────────────────────────────────────────────────────────────
function CTAFinal() {
  return (
    <section className="py-24 px-4">
      <div className="mx-auto max-w-4xl">
        <FadeIn>
          <div className="relative rounded-3xl border border-[#00D4FF]/20 bg-gradient-to-br from-[#00D4FF]/8 to-[#10B981]/5 p-10 md:p-16 text-center overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-px bg-gradient-to-r from-transparent via-[#00D4FF]/50 to-transparent" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-[#00D4FF]/5 blur-3xl pointer-events-none" />

            <div className="relative">
              <div className="text-[#00D4FF] text-sm font-medium mb-4 tracking-wider uppercase">
                Prêt à démarrer ?
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-syne text-white mb-5">
                Rejoignez {siteConfig.stats.clients} entreprises<br />qui font confiance à TextoPro
              </h2>
              <p className="text-white/50 max-w-xl mx-auto mb-8">
                Création de compte gratuite. Rechargez quand vous voulez, sans abonnement. Commencez à envoyer en quelques minutes.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#00D4FF] hover:bg-[#00C4EF] text-black font-semibold px-8 py-4 rounded-xl transition-all hover:scale-105 text-base"
                >
                  Créer mon compte gratuitement
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <a
                  href={`https://wa.me/${siteConfig.whatsapp.replace('+', '')}?text=Bonjour, je souhaite en savoir plus sur TextoPro`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/15 hover:border-white/30 text-white/70 hover:text-white px-8 py-4 rounded-xl transition-all text-base"
                >
                  <svg className="w-5 h-5" style={{ color: '#25D366' }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.549 4.107 1.512 5.838L.057 23.804a.75.75 0 00.931.932l5.966-1.457A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.723 9.723 0 01-4.964-1.358l-.356-.211-3.683.9.914-3.584-.232-.371A9.72 9.72 0 012.25 12c0-5.375 4.375-9.75 9.75-9.75S21.75 6.625 21.75 12s-4.376 9.75-9.75 9.75z" />
                  </svg>
                  Parler à un conseiller
                </a>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

// ──────────────────────────────────────────────────────────────
// Footer
// ──────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-white/5 py-12 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="grid md:grid-cols-4 gap-8 mb-10">
          <div className="md:col-span-2">
            <div className="text-2xl font-bold font-syne bg-gradient-to-r from-[#00D4FF] to-[#10B981] bg-clip-text text-transparent mb-3">
              Texto<span className="text-white">Pro</span>
            </div>
            <p className="text-white/40 text-sm leading-relaxed max-w-xs">
              La plateforme SMS professionnelle pour les entreprises en Côte d'Ivoire. Simple, fiable et abordable.
            </p>
          </div>

          <div>
            <div className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-4">Produit</div>
            <ul className="space-y-2.5">
              {[['SMS Promotionnel', '#services'], ['SMS Transactionnel', '#services'], ['OTP par SMS', '#services'], ['Tarifs', '#tarifs'], ['API', '#api']].map(([label, href]) => (
                <li key={label}>
                  <a href={href} className="text-white/40 hover:text-white/70 text-sm transition-colors">{label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-4">Compte</div>
            <ul className="space-y-2.5">
              {[['Créer un compte', '/register'], ['Se connecter', '/login'], ['FAQ', '#faq']].map(([label, href]) => (
                <li key={label}>
                  <a href={href} className="text-white/40 hover:text-white/70 text-sm transition-colors">{label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/25 text-xs">
            © {new Date().getFullYear()} TextoPro. Tous droits réservés. Côte d'Ivoire.
          </p>
          <p className="text-white/20 text-xs">
            Propulsé par l'infrastructure SMS LeTexto
          </p>
        </div>
      </div>
    </footer>
  )
}

// ──────────────────────────────────────────────────────────────
// WhatsApp Floating Button
// ──────────────────────────────────────────────────────────────
function WhatsAppButton() {
  return (
    <a
      href={`https://wa.me/${siteConfig.whatsapp.replace('+', '')}?text=Bonjour, je souhaite en savoir plus sur TextoPro`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
      style={{
        background: '#25D366',
        boxShadow: '0 4px 20px rgba(37,211,102,0.35)',
        animation: 'fadeSlideUp 0.5s ease 1.5s both',
      }}
      aria-label="Contacter sur WhatsApp"
    >
      <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.549 4.107 1.512 5.838L.057 23.804a.75.75 0 00.931.932l5.966-1.457A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.723 9.723 0 01-4.964-1.358l-.356-.211-3.683.9.914-3.584-.232-.371A9.72 9.72 0 012.25 12c0-5.375 4.375-9.75 9.75-9.75S21.75 6.625 21.75 12s-4.376 9.75-9.75 9.75z" />
      </svg>
    </a>
  )
}

// ──────────────────────────────────────────────────────────────
// Main export
// ──────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.replace(session.user.role === 'ADMIN' ? '/admin' : '/dashboard')
    }
  }, [session, status, router])

  // Pendant la vérification de session, afficher la page normalement
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white font-sans">
      <Navbar />
      <main>
        <Hero />
        <Services />
        <HowItWorks />
        <Pricing />
        <CodePreview />
        <FAQ />
        <CTAFinal />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  )
}
