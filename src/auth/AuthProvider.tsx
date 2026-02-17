import { useEffect, useMemo, useState } from 'react'
import { getMe, loginUser, registerUser } from '../api/backend'
import { AuthContext, type AuthUser } from './auth-context'
const tokenKey = 'rl-auth-token'

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem(tokenKey))
  const [isAuthReady, setIsAuthReady] = useState(false)

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setIsAuthReady(true)
        return
      }
      try {
        const me = await getMe(token)
        setUser(me.user)
      } catch {
        localStorage.removeItem(tokenKey)
        setToken(null)
        setUser(null)
      } finally {
        setIsAuthReady(true)
      }
    }
    bootstrap()
  }, [token])

  const login = async (payload: { email: string; password: string }) => {
    const result = await loginUser(payload)
    localStorage.setItem(tokenKey, result.token)
    setToken(result.token)
    setUser(result.user)
  }

  const register = async (payload: { username: string; email: string; password: string }) => {
    const result = await registerUser(payload)
    localStorage.setItem(tokenKey, result.token)
    setToken(result.token)
    setUser(result.user)
  }

  const logout = () => {
    localStorage.removeItem(tokenKey)
    setToken(null)
    setUser(null)
  }

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isAuthReady,
      login,
      register,
      logout,
    }),
    [isAuthReady, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
