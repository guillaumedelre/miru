import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, getRedirectResult, signOut, type User } from 'firebase/auth'
import { auth } from '@/lib/firebase'

interface AuthContextValue {
  user: User | null
  loading: boolean
  redirectError: string | null
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [redirectError, setRedirectError] = useState<string | null>(null)

  useEffect(() => {
    let pendingUser: User | null = null
    let authSettled = false
    let redirectSettled = false

    function settle() {
      if (authSettled && redirectSettled) {
        setUser(pendingUser)
        setLoading(false)
      }
    }

    getRedirectResult(auth)
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : 'Erreur de connexion'
        if (!msg.includes('redirect-cancelled')) setRedirectError(msg)
      })
      .finally(() => {
        redirectSettled = true
        settle()
      })

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      pendingUser = u
      authSettled = true
      settle()
    })

    return unsubscribe
  }, [])

  async function logout() {
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, loading, redirectError, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
