import { useState } from 'react'
import { Toaster } from 'sonner'
import { BrowserRouter, NavLink, Route, Routes, Navigate, useLocation } from 'react-router-dom'
import { LogOut, CalendarDays, LayoutGrid, BarChart3, UserCircle, Tv, type LucideIcon } from 'lucide-react'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { TopbarActionsProvider, useTopbarActions } from '@/contexts/TopbarActionsContext'
import { StoreProvider } from '@/store'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import WeekView from '@/pages/WeekView'
import Library from '@/pages/Library'
import Stats from '@/pages/Stats'
import ToWatch from '@/pages/ToWatch'
import Login from '@/pages/Login'
import Import from '@/pages/Import'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Calendrier',
  '/to-watch': 'À voir',
  '/library': 'Médiathèque',
  '/stats': 'Statistiques',
}

interface NavItemDef {
  to: string
  end?: boolean
  icon: LucideIcon
  label: string
  shortLabel?: string
}

const NAV_ITEMS: NavItemDef[] = [
  { to: '/to-watch', icon: Tv, label: 'À voir' },
  { to: '/library', icon: LayoutGrid, label: 'Médiathèque' },
  { to: '/', end: true, icon: CalendarDays, label: 'Calendrier' },
  { to: '/stats', icon: BarChart3, label: 'Statistiques', shortLabel: 'Stats' },
]

function DesktopNavItem({ to, end, icon: Icon, label }: NavItemDef) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive ? 'font-semibold bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={16} className={isActive ? 'text-primary' : ''} />
          {label}
        </>
      )}
    </NavLink>
  )
}

function MobileNavItem({ to, end, icon: Icon, label, shortLabel }: NavItemDef) {
  return (
    <NavLink to={to} end={end} className="flex-1 flex flex-col items-center py-2 gap-0.5">
      {({ isActive }) => (
        <>
          <Icon className={`size-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className={`text-[10px] ${isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
            {shortLabel ?? label}
          </span>
        </>
      )}
    </NavLink>
  )
}

function AppShell() {
  const { user, loading, logout } = useAuth()
  const { actions } = useTopbarActions()
  const location = useLocation()
  const pageTitle = PAGE_TITLES[location.pathname] ?? ''
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false)

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

        {/* Navigation - desktop */}
        <div className="hidden sm:flex gap-1 items-center">
          {NAV_ITEMS.map(item => <DesktopNavItem key={item.to} {...item} />)}
        </div>

        {/* Actions contextuelles (slot injecté par la page courante) - mobile uniquement */}
        {actions && (
          <div className="ml-auto sm:hidden flex items-center">{actions}</div>
        )}

        {/* Avatar + logout direct - desktop */}
        <div className="hidden sm:flex ml-auto items-center gap-3">
          {user.photoURL
            ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full" />
            : <UserCircle size={20} className="text-muted-foreground" />
          }
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
          <Route path="/to-watch" element={<ToWatch />} />
          <Route path="/library" element={<Library />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/import" element={<Import />} />
          <Route path="*" element={<Navigate to="/to-watch" replace />} />
        </Routes>
      </main>

      {/* Navigation mobile bas d'écran */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex z-40">
        {NAV_ITEMS.map(item => <MobileNavItem key={item.to} {...item} />)}
        <button
          onClick={() => setConfirmLogoutOpen(true)}
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          {user.photoURL
            ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="size-5 rounded-full" />
            : <UserCircle className="size-5" />
          }
          <span className="text-[10px]">Profil</span>
        </button>
      </nav>

      {/* Dialog confirmation déconnexion - mobile */}
      <Dialog open={confirmLogoutOpen} onOpenChange={setConfirmLogoutOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Se déconnecter ?</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={() => setConfirmLogoutOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={() => { logout(); setConfirmLogoutOpen(false) }}>
              Se déconnecter
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
          <Toaster position="bottom-center" richColors />
        </BrowserRouter>
      </TopbarActionsProvider>
    </AuthProvider>
  )
}
