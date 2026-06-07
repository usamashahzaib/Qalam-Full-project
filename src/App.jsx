import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from 'sonner'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Outlet,
} from 'react-router-dom'
import PageNotFound from './lib/PageNotFound'
import { AppProvider } from '@/lib/AppContext'

import Landing from '@/vite-pages/Landing'
import Onboarding from '@/vite-pages/Onboarding'
import AppLayout from '@/components/layout/AppLayout'
import Dashboard from '@/vite-pages/Dashboard'
import Writer from '@/vite-pages/Writer'
import ContentCalendar from '@/vite-pages/ContentCalendar'
import Library from '@/vite-pages/Library'
import Analytics from '@/vite-pages/Analytics'
import VoiceFingerprint from '@/vite-pages/VoiceFingerprint'
import Agency from '@/vite-pages/Agency'
import Settings from '@/vite-pages/Settings'
import Competitors from '@/vite-pages/Competitors'

const RequireAuth = () => {
  return <Outlet />
}

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<Landing />} />
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
  )
}

export default App
