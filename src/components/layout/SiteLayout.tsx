import { NavLink, Outlet } from 'react-router-dom'
import { Rocket } from 'lucide-react'
import { useAuth } from '../../auth/auth-context'

const links = [
  { to: '/', label: 'Accueil', end: true },
  { to: '/tournois', label: 'Tournois' },
  { to: '/pickem', label: 'Pick em' },
  { to: '/classement', label: 'Classement' },
  { to: '/actualites', label: 'Actualites' },
]

export const SiteLayout = () => {
  const { user, isAuthenticated, logout } = useAuth()

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="brand">
          <Rocket size={20} />
          <span>Rocket League Pick em</span>
        </div>
        <nav className="site-nav">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className="nav-link">
              {link.label}
            </NavLink>
          ))}
          {isAuthenticated ? (
            <>
              <span className="auth-pill">{user?.username}</span>
              <button type="button" className="button button-ghost auth-btn" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="nav-link">
                Login
              </NavLink>
              <NavLink to="/register" className="nav-link">
                Register
              </NavLink>
            </>
          )}
        </nav>
      </header>
      <main className="site-content">
        <Outlet />
      </main>
    </div>
  )
}
