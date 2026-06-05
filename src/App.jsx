import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from 'sonner'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  Outlet,
} from 'react-router-dom'
import PageNotFound from './lib/PageNotFound'
import { AuthProvider, useAuth } from '@/lib/AuthContext'
import { AppProvider } from '@/lib/AppContext'

import Landing from '@/pages/Landing'
import Auth from '@/pages/Auth'
import Onboarding from '@/pages/Onboarding'
import AppLayout from '@/components/layout/AppLayout'
import Dashboard from '@/pages/Dashboard'
import Writer from '@/pages/Writer'
import ContentCalendar from '@/pages/ContentCalendar'
import Library from '@/pages/Library'
import Analytics from '@/pages/Analytics'
import VoiceFingerprint from '@/pages/VoiceFingerprint'
import Agency from '@/pages/Agency'
import Settings from '@/pages/Settings'
import Competitors from '@/pages/Competitors'

const AppShellLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="w-6 h-6 border-2 border-muted-foreground/20 border-t-primary rounded-full animate-spin" />
      <span className="text-xs text-muted-foreground">Loading</span>
    </div>
  </div>
)

const RequireAuth = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authChecked, isAuthenticated } =
    useAuth()

  if (isLoadingPublicSettings || isLoadingAuth || !authChecked) {
    return <AppShellLoader />
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  return <Outlet />
}

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/auth/*" element={<Auth />} />
    <Route element={<RequireAuth />}>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/writer" element={<Writer />} />
        <Route path="/calendar" element={<ContentCalendar />} />
        <Route path="/library" element={<Library />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/voice" element={<VoiceFingerprint />} />
        <Route path="/agency" element={<Agency />} />
        <Route path="/competitors" element={<Competitors />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Route>
    <Route path="*" element={<PageNotFound />} />
  </Routes>
)

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AppRoutes />
          </Router>
          <Toaster />
          <SonnerToaster
            theme="light"
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'hsl(0 0% 100%)',
                border: '1px solid hsl(140 12% 88%)',
                color: 'hsl(220 20% 11%)',
                fontSize: '13px',
                boxShadow: '0 10px 40px -12px rgba(6, 55, 43, 0.15)',
              },
            }}
          />
        </QueryClientProvider>
      </AppProvider>
    </AuthProvider>
  )
}

export default App
