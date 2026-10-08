import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { AuthContext, type User } from './auth-context'
import { apiFetch } from './apiFetch'
import { authClient } from './neonAuth'

type AuthProviderProps = {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const result = await authClient.getSession()
        if (result.error) {
          throw new Error(`Could not restore the Neon Auth session: ${result.error.message}`)
        }

        const sessionUser = result.data?.user
        if (sessionUser) {
          const appUser: User = {
            id: sessionUser.id,
            name: sessionUser.name,
            userName: sessionUser.name,
            email: sessionUser.email,
          }
          setIsLoggedIn(true)
          setUser(appUser)
        } else {
          setIsLoggedIn(false)
          setUser(null)
        }
      } catch (error) {
        console.error('Error verifying auth:', error)
        setIsLoggedIn(false)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    void verifyAuth()
  }, [])

  const login = useCallback((userData: User) => {
    setUser(userData)
    setIsLoggedIn(true)
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setIsLoggedIn(false)
  }, [])

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, loading, login, logout, setUser, apiFetch }}>
      {children}
    </AuthContext.Provider>
  )
}
