import { createContext, useContext } from 'react'

export type AuthUser = {
  id: number
  username: string
  email: string
}

export type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isAuthReady: boolean
  login: (payload: { email: string; password: string }) => Promise<void>
  register: (payload: { username: string; email: string; password: string }) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth doit être utilisé dans AuthProvider')
  }
  return ctx
}
