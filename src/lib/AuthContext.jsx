import React, { createContext, useContext, useMemo, useCallback } from 'react'

const AuthContext = createContext(null)

function parseEmailList(envVal) {
  if (!envVal || typeof envVal !== 'string') return []
  return envVal.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
}

export const AuthProvider = ({ children }) => {
  const adminEmails = useMemo(
    () => parseEmailList(import.meta.env.VITE_APP_ADMIN_EMAILS),
    []
  )

  const user = useMemo(() => {
    const email = localStorage.getItem('qalam_user_email') || ''
    if (!email) return null
    return {
      id: email,
      email,
      fullName: localStorage.getItem('qalam_user_name') || email.split('@')[0],
      firstName: (localStorage.getItem('qalam_user_name') || email).split(' ')[0],
      imageUrl: null,
      role: adminEmails.length && adminEmails.includes(email.toLowerCase()) ? 'admin' : 'user',
    }
  }, [adminEmails])

  const isLoadingAuth = false
  const isLoadingPublicSettings = isLoadingAuth
  const authChecked = true
  const isAuthenticated = Boolean(user)
  const authError = null
  const appPublicSettings = null

  const logout = useCallback(
    async (shouldRedirect = true) => {
      if (shouldRedirect) {
        localStorage.removeItem('qalam_user_email')
        localStorage.removeItem('qalam_user_name')
        window.location.assign('/')
      } else {
        localStorage.removeItem('qalam_user_email')
        localStorage.removeItem('qalam_user_name')
      }
    },
    []
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
