import { createContext } from 'react'

export type User = {
  id?: string
  name?: string
  userName?: string
  email?: string
  [key: string]: unknown
}

export type AuthContextValue = {
  isLoggedIn: boolean
  user: User | null
  loading: boolean
  login: (userData: User) => void
  logout: () => void
  setUser: (user: User | null) => void
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
