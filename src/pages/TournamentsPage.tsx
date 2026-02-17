import { GlassCard } from '../components/ui/GlassCard'
import { RocketGoalLoader } from '../components/ui/RocketGoalLoader'
import { useMinimumLoader } from '../hooks/useMinimumLoader'
import { useTournaments } from '../hooks/useEsportData'
import { formatDate, formatMatchTime } from '../utils/date'

export const TournamentsPage = () => {
  const tournamentsQuery = useTournaments()
  const showLoader = useMinimumLoader(tournamentsQuery.isLoading, 1200)

  if (showLoader) {
    return <RocketGoalLoader label="Chargement des tournois..." />
  }

  return (
    <section className="page">
      <h1>Tournois</h1>
      <div className="stack">
        {tournamentsQuery.data?.map((tournament) => (
          <GlassCard key={tournament.id}>
            <div className="row split">
              <div>
                <h2>{tournament.name}</h2>
                <p>{tournament.location}</p>
              </div>
              <div className="right">
                <strong>{tournament.prizePool}</strong>
                <p>
                  {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
                </p>
              </div>
            </div>
            {tournament.stages.length > 0 ? (
              tournament.stages.map((stage) => (
                <div key={stage.id} className="stage">
                  <h3>{stage.name}</h3>
                  <ul className="match-list">
                    {stage.matches.map((match) => (
                      <li key={match.id}>
                        <span>
                          {match.teamA.name} vs {match.teamB.name}
                        </span>
                        <small>{formatMatchTime(match.startUtc)}</small>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <p>Details des matchs a venir dans la source officielle.</p>
            )}
            {tournament.sourceUrl ? (
              <a href={tournament.sourceUrl} target="_blank" rel="noreferrer" className="button button-ghost">
                Ouvrir la page source
              </a>
            ) : null}
          </GlassCard>
        ))}
      </div>
    </section>
  )
}
