import { BrowserRouter, NavLink, Route, Routes, Navigate, useLocation } from 'react-router-dom'
import { LogOut, CalendarDays, LayoutGrid, BarChart3, UserCircle } from 'lucide-react'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { TopbarActionsProvider, useTopbarActions } from '@/contexts/TopbarActionsContext'
import { StoreProvider } from '@/store'
import WeekView from '@/pages/WeekView'
import Library from '@/pages/Library'
import Stats from '@/pages/Stats'
import Login from '@/pages/Login'
import Import from '@/pages/Import'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Calendrier',
  '/library': 'Médiathèque',
  '/stats': 'Statistiques',
}

function AppShell() {
  const { user, loading, logout } = useAuth()
  const { actions } = useTopbarActions()
  const location = useLocation()
  const pageTitle = PAGE_TITLES[location.pathname] ?? ''

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
      <nav className="sticky top-0 z-30 border-b border-border px-3 sm:px-6 py-3 flex gap-3 sm:gap-6 items-center bg-background">
        <img src="/logo.png" alt="miru" className="h-8 w-auto shrink-0" />

        {/* Titre de page - mobile uniquement */}
        {pageTitle && (
          <span className="font-bold text-base sm:hidden">{pageTitle}</span>
        )}

        {/* Liens - desktop uniquement */}
        <div className="hidden sm:flex gap-6 items-center">
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
        </div>

        {/* Actions contextuelles (slot injecté par la page courante) - mobile uniquement */}
        {actions && (
          <div className="ml-auto sm:hidden flex items-center">{actions}</div>
        )}

        {/* Avatar + logout - desktop uniquement */}
        <div className={`hidden sm:flex items-center gap-3 ${actions ? '' : 'ml-auto'}`}>
          {user.photoURL && (
            <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full" />
          )}
          <span className="text-sm text-muted-foreground">
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

      <main className="flex-1 px-3 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-6">
        <Routes>
          <Route path="/" element={<WeekView />} />
          <Route path="/library" element={<Library />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/import" element={<Import />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Navigation mobile bas d'écran */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex z-40">
        <NavLink to="/" end className="flex-1 flex flex-col items-center py-2 gap-0.5">
          {({ isActive }) => (
            <>
              <CalendarDays className={`size-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-[10px] ${isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>Calendrier</span>
            </>
          )}
        </NavLink>
        <NavLink to="/library" className="flex-1 flex flex-col items-center py-2 gap-0.5">
          {({ isActive }) => (
            <>
              <LayoutGrid className={`size-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-[10px] ${isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>Médiathèque</span>
            </>
          )}
        </NavLink>
        <NavLink to="/stats" className="flex-1 flex flex-col items-center py-2 gap-0.5">
          {({ isActive }) => (
            <>
              <BarChart3 className={`size-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-[10px] ${isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>Stats</span>
            </>
          )}
        </NavLink>
        <button
          onClick={logout}
          className="flex-1 flex flex-col items-center py-2 gap-0.5 text-muted-foreground hover:text-foreground transition-colors"
          title="Se déconnecter"
        >
          {user.photoURL
            ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="size-5 rounded-full" />
            : <UserCircle className="size-5" />
          }
          <span className="text-[10px]">Déco</span>
        </button>
      </nav>
    </div>
    </StoreProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <TopbarActionsProvider>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </TopbarActionsProvider>
    </AuthProvider>
  )
}
