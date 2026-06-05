import { useState } from 'react'
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'

function pickBanner(): string {
  const hour = new Date().getHours()
  const isDay = hour >= 7 && hour < 20
  const variant = Math.random() < 0.5 ? '1' : '2'
  return `/banners/banner_${variant}_${isDay ? 'day' : 'night'}.png`
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

export default function Login() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [banner] = useState(pickBanner)

  async function handleSignIn() {
    setError(null)
    setLoading(true)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e: unknown) {
      const code = (e as { code?: string }).code ?? ''
      if (code === 'auth/popup-blocked') {
        setError("Les popups sont bloquées. Clique sur l'icône dans la barre d'adresse pour autoriser les popups sur ce site, puis réessaie.")
      } else if (code !== 'auth/popup-closed-by-user') {
        setError(e instanceof Error ? e.message : 'Erreur de connexion')
      }
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="texture" aria-hidden />

      {/* Colonne gauche — formulaire */}
      <div className="flex flex-col items-center justify-center px-8 py-12 sm:px-16">
        <div className="w-full max-w-sm space-y-8 text-center">

          <div className="space-y-3">
            <img src="/logo.png" alt="miru" className="h-24 w-auto mx-auto" />
            <h1 className="text-2xl font-semibold tracking-tight">Connexion</h1>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <GoogleIcon />
              {loading ? 'Connexion...' : 'Continuer avec Google'}
            </button>

            {error && (
              <p className="text-xs text-destructive text-center pt-1">{error}</p>
            )}
          </div>
        </div>
      </div>

      {/* Colonne droite — décorative */}
      <div className="hidden lg:block relative border-l border-border overflow-hidden">
        <img
          src={banner}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
    </div>
  )
}
