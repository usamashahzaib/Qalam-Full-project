import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { SignIn, SignUp } from '@clerk/clerk-react'
import QalamLogo from '@/components/layout/QalamLogo'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/AuthContext'

const clerkAppearance = {
  variables: {
    colorPrimary: 'hsl(164, 81%, 12%)',
    colorText: 'hsl(220, 20%, 11%)',
    colorTextSecondary: 'hsl(220, 10%, 40%)',
    colorBackground: 'hsl(0, 0%, 100%)',
    colorInputBackground: 'hsl(140, 15%, 96%)',
    colorInputText: 'hsl(220, 20%, 11%)',
    borderRadius: '0.5rem',
  },
  elements: {
    card: 'shadow-lg border border-[hsl(140_12%_88%)]',
    headerTitle: 'font-semibold tracking-tight',
    headerSubtitle: 'text-[hsl(220_10%_40%)]',
    socialButtonsBlockButton: 'border-[hsl(140_12%_88%)]',
    formButtonPrimary: 'bg-[hsl(164,81%,12%)] hover:bg-[hsl(164,81%,16%)]',
  },
}

export default function Auth() {
  const { isAuthenticated, isLoadingAuth, authChecked } = useAuth()

  if (authChecked && !isLoadingAuth && isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12 border-r border-border/80 bg-gradient-to-br from-[hsl(140_30%_96%)] via-background to-[hsl(150_22%_94%)]">
        <div className="max-w-md">
          <QalamLogo size="lg" />
          <p className="text-lg text-muted-foreground mt-6 leading-relaxed font-light">
            Build a publishing system your audience recognizes. Write in your real voice.
          </p>
          <div className="mt-12 space-y-4">
            {[
              'Consistent voice across every post',
              'A system that sharpens with every post you write',
              'Built for founders, operators, and consultants',
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-1 h-1 rounded-full bg-primary" />
                <span className="text-sm text-muted-foreground">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md flex flex-col items-center"
        >
          <div className="lg:hidden mb-8 self-start">
            <QalamLogo size="md" />
          </div>
          <Routes>
            <Route
              path="sign-up/*"
              element={
                <SignUp
                  routing="path"
                  path="/auth/sign-up"
                  signInUrl="/auth"
                  appearance={clerkAppearance}
                />
              }
            />
            <Route
              path="*"
              element={
                <SignIn
                  routing="path"
                  path="/auth"
                  signUpUrl="/auth/sign-up"
                  appearance={clerkAppearance}
                />
              }
            />
          </Routes>
        </motion.div>
      </div>
    </div>
  )
}
