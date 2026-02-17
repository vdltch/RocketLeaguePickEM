import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GlassCard } from '../components/ui/GlassCard'
import { useAuth } from '../auth/auth-context'

export const RegisterPage = () => {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await register({ username, email, password })
      navigate('/pickem')
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'inscription")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="page auth-page">
      <GlassCard className="auth-card">
        <h1>Créer un compte</h1>
        <form className="auth-form" onSubmit={onSubmit}>
          <label>
            Pseudo
            <input
              className="input"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              minLength={2}
              maxLength={24}
              required
            />
          </label>
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
              minLength={6}
              required
            />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <button className="button button-primary" type="submit" disabled={isLoading}>
            {isLoading ? 'Création...' : 'Créer le compte'}
          </button>
        </form>
        <p>
          Déjà inscrit ? <Link to="/login">Se connecter</Link>
        </p>
      </GlassCard>
    </section>
  )
}
