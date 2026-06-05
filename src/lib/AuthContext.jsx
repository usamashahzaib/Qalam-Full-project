import React, { createContext, useContext, useMemo, useCallback } from 'react'
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react'

const AuthContext = createContext(null)

function parseEmailList(envVal) {
  if (!envVal || typeof envVal !== 'string') return []
  return envVal.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
}

export const AuthProvider = ({ children }) => {
  const { isLoaded, isSignedIn, signOut } = useClerkAuth()
  const { user: clerkUser, isLoaded: userLoaded } = useUser()

  const adminEmails = useMemo(
    () => parseEmailList(import.meta.env.VITE_APP_ADMIN_EMAILS),
    []
  )

  const user = useMemo(() => {
    if (!clerkUser) return null
    const email =
      clerkUser.primaryEmailAddress?.emailAddress?.toLowerCase() ?? ''
    return {
      id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress,
      fullName: clerkUser.fullName,
      firstName: clerkUser.firstName,
      imageUrl: clerkUser.imageUrl,
      role:
        adminEmails.length && email && adminEmails.includes(email)
          ? 'admin'
          : 'user',
    }
  }, [clerkUser, adminEmails])

  const isLoadingAuth = !isLoaded || !userLoaded
  const isLoadingPublicSettings = isLoadingAuth
  const authChecked = isLoaded && userLoaded
  const isAuthenticated = Boolean(isSignedIn && user)
  const authError = null
  const appPublicSettings = null

  const logout = useCallback(
    async (shouldRedirect = true) => {
      if (shouldRedirect) {
        await signOut({ redirectUrl: window.location.origin + '/' })
      } else {
        await signOut()
      }
    },
    [signOut]
  )

  const navigateToLogin = useCallback(() => {
    window.location.assign('/auth')
  }, [])

  const checkUserAuth = useCallback(async () => {}, [])

  const checkAppState = useCallback(async () => {}, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        authChecked,
        logout,
        navigateToLogin,
        checkUserAuth,
        checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
