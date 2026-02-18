import { useMemo } from 'react'
import { RocketGoalLoader } from '../components/ui/RocketGoalLoader'
import { useTournaments } from '../hooks/useEsportData'
import { useMinimumLoader } from '../hooks/useMinimumLoader'
import { resolveTeamProfile } from '../data/teamProfiles'

type TeamPresence = {
  name: string
  tournaments: string[]
}

const collectTeams = (
  tournaments: Array<{
    name: string
    stages: Array<{ matches: Array<{ teamA: { name: string }; teamB: { name: string } }> }>
    swissGroups?: Array<{ standings: Array<{ team: string }> }>
  }>,
): TeamPresence[] => {
  const map = new Map<string, Set<string>>()

  const add = (team: string, tournamentName: string) => {
    if (!team || team.toLowerCase() === 'tbd') {
      return
    }
    if (!map.has(team)) {
      map.set(team, new Set())
    }
    map.get(team)?.add(tournamentName)
  }

  for (const tournament of tournaments) {
    for (const stage of tournament.stages) {
      for (const match of stage.matches) {
        add(match.teamA.name, tournament.name)
        add(match.teamB.name, tournament.name)
      }
    }

    for (const group of tournament.swissGroups ?? []) {
      for (const standing of group.standings) {
        add(standing.team, tournament.name)
      }
    }
  }

  return Array.from(map.entries())
    .map(([name, items]) => ({ name, tournaments: Array.from(items) }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export const TeamsPage = () => {
  const tournamentsQuery = useTournaments()
  const showLoader = useMinimumLoader(tournamentsQuery.isLoading, 1200)

  const teams = useMemo(() => {
    if (!tournamentsQuery.data) {
      return []
    }
    return collectTeams(tournamentsQuery.data)
  }, [tournamentsQuery.data])

  if (showLoader) {
    return <RocketGoalLoader label="Chargement des equipes..." />
  }

  return (
    <section className="page">
      <h1>Teams</h1>
      <p>Equipes presentes aux tournois 2026. Survole une carte pour voir roster et coach.</p>

      <div className="teams-grid">
        {teams.map((team) => {
          const profile = resolveTeamProfile(team.name)

          return (
            <article key={team.name} className="team-card" tabIndex={0}>
              <div className="team-card-top">
                <div
                  className="team-logo"
                  style={{
                    background: `linear-gradient(140deg, ${profile.logoFrom}, ${profile.logoTo})`,
                  }}
                >
                  <span>{profile.logoText}</span>
                </div>

                <div>
                  <h3>{team.name}</h3>
                  <p>
                    Region {profile.region} - {team.tournaments.length} tournoi{team.tournaments.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className="team-tags">
                {team.tournaments.map((tournamentName) => (
                  <span key={`${team.name}-${tournamentName}`} className="team-tag">
                    {tournamentName}
                  </span>
                ))}
              </div>

              <div className="team-hover-panel">
                <h4>Roster</h4>
                <ul>
                  {profile.players.map((player) => (
                    <li key={`${team.name}-${player}`}>{player}</li>
                  ))}
                </ul>
                <p>
                  <strong>Coach:</strong> {profile.coach}
                </p>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
