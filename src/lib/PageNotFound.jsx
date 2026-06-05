import { useLocation } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'

function parseAdminEmails() {
  const raw = import.meta.env.VITE_APP_ADMIN_EMAILS
  if (!raw || typeof raw !== 'string') return []
  return raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
}

export default function PageNotFound() {
  const location = useLocation()
  const pageName = location.pathname.substring(1)
  const { user, isLoaded } = useUser()

  const adminEmails = parseAdminEmails()
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? ''
  const isAdmin =
    isLoaded &&
    user &&
    adminEmails.length > 0 &&
    email &&
    adminEmails.includes(email)

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-7xl font-light text-muted-foreground/30">404</h1>
            <div className="h-0.5 w-16 bg-border mx-auto" />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-medium text-foreground">Page Not Found</h2>
            <p className="text-muted-foreground leading-relaxed">
              The page{' '}
              <span className="font-medium text-foreground">&quot;{pageName}&quot;</span> could
              not be found.
            </p>
          </div>
          {isAdmin && (
            <div className="mt-8 p-4 bg-muted rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">
                This page hasn&apos;t been created yet.
              </p>
            </div>
          )}
          <div className="pt-6">
            <button
              type="button"
              onClick={() => {
                window.location.href = '/'
              }}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-foreground bg-muted border border-border rounded-lg hover:bg-accent transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
