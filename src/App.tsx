import { BrowserRouter, NavLink, Route, Routes, Navigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { StoreProvider } from '@/store'
import WeekView from '@/pages/WeekView'
import Library from '@/pages/Library'
import Stats from '@/pages/Stats'
import Login from '@/pages/Login'
import Import from '@/pages/Import'

function AppShell() {
  const { user, loading, logout } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="texture" aria-hidden />
        <p className="text-muted-foreground text-sm">Chargement...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    )
  }

  return (
    <StoreProvider key={user.uid} userId={user.uid}>
    <div className="min-h-screen flex flex-col">
      <div className="texture" aria-hidden />
      <nav className="border-b border-border px-6 py-3 flex gap-6 items-center">
        <img src="/logo.png" alt="miru" className="h-8 w-auto mr-2" />
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            isActive ? 'font-semibold underline underline-offset-4' : 'text-muted-foreground hover:text-foreground'
          }
        >
          Calendrier
        </NavLink>
        <NavLink
          to="/library"
          className={({ isActive }) =>
            isActive ? 'font-semibold underline underline-offset-4' : 'text-muted-foreground hover:text-foreground'
          }
        >
          Médiathèque
        </NavLink>
        <NavLink
          to="/stats"
          className={({ isActive }) =>
            isActive ? 'font-semibold underline underline-offset-4' : 'text-muted-foreground hover:text-foreground'
          }
        >
          Statistiques
        </NavLink>

        <div className="ml-auto flex items-center gap-3">
          {user.photoURL && (
            <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full" />
          )}
          <span className="text-sm text-muted-foreground hidden sm:block">
            {user.displayName ?? user.email}
          </span>
          <button
            onClick={logout}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Se déconnecter"
          >
            <LogOut size={16} />
          </button>
        </div>
      </nav>
      <main className="flex-1 px-6 py-6">
        <Routes>
          <Route path="/" element={<WeekView />} />
          <Route path="/library" element={<Library />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/import" element={<Import />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
    </StoreProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  )
}
