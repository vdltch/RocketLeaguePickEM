import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GlassCard } from '../components/ui/GlassCard'
import { useAuth } from '../auth/auth-context'

export const LoginPage = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await login({ email, password })
      navigate('/pickem')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="page auth-page">
      <GlassCard className="auth-card">
        <h1>Connexion</h1>
        <form className="auth-form" onSubmit={onSubmit}>
          <label>
            Email
            <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            Mot de passe
            <input
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <button className="button button-primary" type="submit" disabled={isLoading}>
            {isLoading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        <p>
          Pas de compte ? <Link to="/register">Créer un compte</Link>
        </p>
      </GlassCard>
    </section>
  )
}
