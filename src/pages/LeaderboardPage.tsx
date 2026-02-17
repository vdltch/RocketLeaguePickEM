import { useQuery } from '@tanstack/react-query'
import { getLeaderboard } from '../api/backend'
import { GlassCard } from '../components/ui/GlassCard'

export const LeaderboardPage = () => {
  const leaderboardQuery = useQuery({
    queryKey: ['leaderboard'],
    queryFn: getLeaderboard,
    retry: 1,
    refetchInterval: false,
  })

  if (leaderboardQuery.isLoading) {
    return <p className="status">Chargement du classement...</p>
  }

  if (leaderboardQuery.isError) {
    return <p className="status">Impossible de charger le classement.</p>
  }

  const leaderboard = leaderboardQuery.data?.leaderboard ?? []

  return (
    <section className="page">
      <h1>Classement Pick em</h1>
      <div className="stack">
        {leaderboard.length === 0 ? (
          <GlassCard>Aucun utilisateur en base.</GlassCard>
        ) : (
          leaderboard.map((player, index) => (
            <GlassCard key={player.userId} className="row split">
              <div className="row">
                <span className="rank">#{index + 1}</span>
                <strong>{player.username}</strong>
              </div>
              <span>{player.points} pts</span>
            </GlassCard>
          ))
        )}
      </div>
    </section>
  )
}
