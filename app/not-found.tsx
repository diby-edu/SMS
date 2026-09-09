import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-6 text-center">
      <p className="font-syne text-6xl font-bold text-primary mb-2">404</p>
      <h1 className="font-syne text-2xl font-bold mb-3">Page introuvable</h1>
      <p className="text-foreground-muted mb-8 max-w-md">
        La page que vous cherchez n&apos;existe pas ou a été déplacée.
      </p>
      <Link
        href="/"
        className="bg-primary text-background font-semibold px-5 py-2.5 rounded-lg hover:bg-primary-hover transition-colors"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  )
}
