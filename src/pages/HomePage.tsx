import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { Trophy, Pickaxe, Newspaper } from 'lucide-react'
import { GlassCard } from '../components/ui/GlassCard'
import { useNews, useTournaments } from '../hooks/useEsportData'

export const HomePage = () => {
  const tournamentsQuery = useTournaments()
  const newsQuery = useNews()

  const headline = useMemo(() => newsQuery.data?.[0], [newsQuery.data])

  return (
    <section className="page">
      <div className="hero">
        <p className="eyebrow">RL Esport Hub</p>
        <h1>Suis la scene Rocket League et construis tes meilleurs Pick em.</h1>
        <p className="hero-copy">
          Tournois, pronostics et classement communautaire dans une interface rapide et moderne.
        </p>
        <div className="hero-actions">
          <Link to="/pickem" className="button button-primary">
            Commencer mes picks
          </Link>
          <Link to="/tournois" className="button button-ghost">
            Voir les tournois
          </Link>
        </div>
      </div>

      <div className="grid grid-3">
        <GlassCard>
          <Trophy />
          <h3>{tournamentsQuery.data?.length ?? 0} evenements actifs</h3>
          <p>Calendrier compact avec matchs et stages par tournoi.</p>
        </GlassCard>
        <GlassCard>
          <Pickaxe />
          <h3>Pick em interactif</h3>
          <p>Choisis le vainqueur de chaque match et compare ton score.</p>
        </GlassCard>
        <GlassCard>
          <Newspaper />
          <h3>News scene RL</h3>
          <p>{headline ? headline.title : 'Chargement des derniers titres...'}</p>
        </GlassCard>
      </div>
    </section>
  )
}
