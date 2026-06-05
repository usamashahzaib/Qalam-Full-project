import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import App from '@/App.jsx'
import '@/index.css'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

function MissingClerkKey() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[hsl(140_25%_97%)] text-[hsl(220_20%_11%)]">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-lg font-semibold">Configuration needed</h1>
        <p className="text-sm text-[hsl(220_10%_40%)]">
          Add <code className="text-xs bg-white/80 px-1 py-0.5 rounded">VITE_CLERK_PUBLISHABLE_KEY</code> to{' '}
          <code className="text-xs bg-white/80 px-1 py-0.5 rounded">.env.local</code> and restart the dev server.
        </p>
      </div>
    </div>
  )
}

const root = (
  publishableKey ? (
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl="/auth"
      signUpUrl="/auth/sign-up"
      afterSignInUrl="/dashboard"
      afterSignUpUrl="/onboarding"
    >
      <App />
    </ClerkProvider>
  ) : (
    <MissingClerkKey />
  )
)

ReactDOM.createRoot(document.getElementById('root')).render(root)
