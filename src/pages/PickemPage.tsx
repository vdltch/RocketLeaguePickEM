import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getUserPicks, saveUserPicks } from '../api/backend'
import { useAuth } from '../auth/auth-context'
import { GlassCard } from '../components/ui/GlassCard'
import { RocketGoalLoader } from '../components/ui/RocketGoalLoader'
import { BracketBoard } from '../components/pickem/BracketBoard'
import { SwissGroupsBoard } from '../components/pickem/SwissGroupsBoard'
import { useMinimumLoader } from '../hooks/useMinimumLoader'
import { useTournaments } from '../hooks/useEsportData'
import { usePickemStore } from '../store/pickemStore'

type PickemTab = 'swiss' | 'playoffs'

export const PickemPage = () => {
  const tournamentsQuery = useTournaments()
  const showLoader = useMinimumLoader(tournamentsQuery.isLoading, 1200)
  const { user, token, isAuthenticated } = useAuth()
  const username = usePickemStore((state) => state.username)
  const setUsername = usePickemStore((state) => state.setUsername)
  const bracketPredictions = usePickemStore((state) => state.bracketPredictions)
  const bracketScorePredictions = usePickemStore((state) => state.bracketScorePredictions)
  const pickBracketWinner = usePickemStore((state) => state.pickBracketWinner)
  const clearBracketPredictions = usePickemStore((state) => state.clearBracketPredictions)
  const setBracketScore = usePickemStore((state) => state.setBracketScore)
  const clearBracketScores = usePickemStore((state) => state.clearBracketScores)

  const [selectedTournamentIdRaw, setSelectedTournamentId] = useState<string>('')
  const [activeTab, setActiveTab] = useState<PickemTab>('swiss')
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('idle')
  const isHydratingRef = useRef(false)
  const selectedTournamentId = useMemo(() => {
    if (selectedTournamentIdRaw) {
      return selectedTournamentIdRaw
    }
    if (!tournamentsQuery.data?.length) {
      return ''
    }
    const boston = tournamentsQuery.data.find((item) => item.name.toLowerCase().includes('boston'))
    return boston?.id ?? tournamentsQuery.data[0].id
  }, [selectedTournamentIdRaw, tournamentsQuery.data])

  const tournament = useMemo(
    () => tournamentsQuery.data?.find((item) => item.id === selectedTournamentId),
    [selectedTournamentId, tournamentsQuery.data],
  )

  const toScopedId = useCallback(
    (tab: PickemTab, matchId: string) => `${selectedTournamentId}:${tab}:${matchId}`,
    [selectedTournamentId],
  )
  const activeBracket = activeTab === 'swiss' ? tournament?.swissBracket : tournament?.bracket
  const activeMatchIds = useMemo(
    () =>
      activeTab === 'swiss'
        ? tournament?.swissGroups?.flatMap((group) => group.matches.map((match) => match.id)) ??
          activeBracket?.rounds.flatMap((round) => round.matches.map((match) => match.id)) ??
          []
        : activeBracket?.rounds.flatMap((round) => round.matches.map((match) => match.id)) ?? [],
    [activeBracket?.rounds, activeTab, tournament?.swissGroups],
  )
  const totalPredictions = activeMatchIds.filter((id) => bracketPredictions[toScopedId(activeTab, id)]).length
  const getPrediction = (matchId: string) => bracketPredictions[toScopedId(activeTab, matchId)]
  const getScore = (matchId: string) => bracketScorePredictions[toScopedId(activeTab, matchId)]
  const pickForCurrentTab = (matchId: string, side: 'A' | 'B') =>
    pickBracketWinner(toScopedId(activeTab, matchId), side)
  const setScoreForCurrentTab = (matchId: string, side: 'A' | 'B', score?: number) => {
    const scopedId = toScopedId(activeTab, matchId)
    const current = bracketScorePredictions[scopedId] ?? {}

    const toIntOrUndefined = (value?: number) =>
      value === undefined || Number.isNaN(value) ? undefined : Math.max(0, Math.floor(value))

    let a = side === 'A' ? toIntOrUndefined(score) : toIntOrUndefined(current.a)
    let b = side === 'B' ? toIntOrUndefined(score) : toIntOrUndefined(current.b)

    if (activeTab === 'swiss') {
      if (a !== undefined) a = Math.min(3, a)
      if (b !== undefined) b = Math.min(3, b)
      if (a === 3 && b !== undefined) b = Math.min(2, b)
      if (b === 3 && a !== undefined) a = Math.min(2, a)
    } else {
      if (a !== undefined) a = Math.min(4, a)
      if (b !== undefined) b = Math.min(4, b)
    }

    setBracketScore(scopedId, 'A', a)
    setBracketScore(scopedId, 'B', b)

    if (a === undefined || b === undefined || a === b) {
      return
    }
    pickBracketWinner(scopedId, a > b ? 'A' : 'B')
  }

  useEffect(() => {
    if (user?.username) {
      setUsername(user.username)
    }
  }, [setUsername, user?.username])

  useEffect(() => {
    const hydrate = async () => {
      if (!isAuthenticated || !token || !selectedTournamentId) {
        return
      }
      isHydratingRef.current = true
      setSyncStatus('loading')
      const scopedIds = activeMatchIds.map((id) => toScopedId(activeTab, id))
      clearBracketPredictions(scopedIds)
      clearBracketScores(scopedIds)
      try {
        const remote = await getUserPicks(token, selectedTournamentId, activeTab)
        for (const pick of remote.picks) {
          const scoped = toScopedId(activeTab, pick.matchId)
          if (pick.scoreA !== undefined) {
            setBracketScore(scoped, 'A', pick.scoreA)
          }
          if (pick.scoreB !== undefined) {
            setBracketScore(scoped, 'B', pick.scoreB)
          }
          if (pick.winnerSide) {
            pickBracketWinner(scoped, pick.winnerSide)
          }
        }
        setSyncStatus('saved')
      } catch {
        setSyncStatus('error')
      } finally {
        isHydratingRef.current = false
      }
    }
    hydrate()
  }, [
    activeMatchIds,
    activeTab,
    clearBracketPredictions,
    clearBracketScores,
    isAuthenticated,
    pickBracketWinner,
    selectedTournamentId,
    setBracketScore,
    toScopedId,
    token,
  ])

  useEffect(() => {
    if (!isAuthenticated || !token || !selectedTournamentId || isHydratingRef.current) {
      return
    }

    const timer = setTimeout(async () => {
      try {
        setSyncStatus('saving')
        const payload = activeMatchIds.map((matchId) => {
          const scoped = toScopedId(activeTab, matchId)
          const score = bracketScorePredictions[scoped]
          return {
            matchId,
            winnerSide: bracketPredictions[scoped],
            scoreA: score?.a,
            scoreB: score?.b,
          }
        })
        await saveUserPicks(token, { tournamentId: selectedTournamentId, tab: activeTab, picks: payload })
        setSyncStatus('saved')
      } catch {
        setSyncStatus('error')
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [
    activeMatchIds,
    activeTab,
    bracketPredictions,
    bracketScorePredictions,
    isAuthenticated,
    selectedTournamentId,
    toScopedId,
    token,
  ])

  if (showLoader) {
    return <RocketGoalLoader label="Préparation du module Pick em..." />
  }

  return (
    <section className="page">
      <div className="row split">
        <h1>Pick em Bracket</h1>
        <div className="row">
          <label htmlFor="tournament">Tournoi 2026</label>
          <select
            id="tournament"
            value={selectedTournamentId}
            onChange={(event) => setSelectedTournamentId(event.target.value)}
          >
            {tournamentsQuery.data?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <GlassCard className="row split">
        <div>
          <h3>Profil joueur</h3>
          <p>Ton pseudo est utilise pour le classement local.</p>
        </div>
        <input
          className="input"
          value={username}
          maxLength={24}
          onChange={(event) => setUsername(event.target.value)}
        />
      </GlassCard>

      <GlassCard className="row split">
        <div>
          <h3>Progression {activeTab === 'swiss' ? 'Swiss' : 'Playoffs'}</h3>
          <p>
            {totalPredictions}/{activeMatchIds.length} matchs pronostiques
          </p>
          {isAuthenticated ? <small>Sync BDD: {syncStatus}</small> : <small>Connecte-toi pour sauvegarder en BDD.</small>}
        </div>
        <div className="right">
          {tournament?.sourceUrl ? (
            <a href={tournament.sourceUrl} target="_blank" rel="noreferrer" className="button button-ghost">
              Source API
            </a>
          ) : null}
          <button
            type="button"
            className="button button-ghost"
            onClick={() => {
              const ids = activeMatchIds.map((id) => toScopedId(activeTab, id))
              clearBracketPredictions(ids)
              clearBracketScores(ids)
            }}
          >
            Reinitialiser
          </button>
        </div>
      </GlassCard>

      <div className="tab-nav" role="tablist" aria-label="Choix du mode Pick em">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'swiss'}
          className={`tab-button ${activeTab === 'swiss' ? 'tab-button-active' : ''}`}
          onClick={() => setActiveTab('swiss')}
        >
          Swiss Stage
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'playoffs'}
          className={`tab-button ${activeTab === 'playoffs' ? 'tab-button-active' : ''}`}
          onClick={() => setActiveTab('playoffs')}
        >
          Playoffs
        </button>
      </div>

      {activeTab === 'swiss' && tournament?.swissGroups ? (
        <SwissGroupsBoard
          groups={tournament.swissGroups}
          getPrediction={getPrediction}
          getScore={getScore}
          onPick={pickForCurrentTab}
          onScoreChange={setScoreForCurrentTab}
        />
      ) : activeBracket ? (
        <BracketBoard
          bracket={activeBracket}
          getPrediction={getPrediction}
          getScore={getScore}
          onPick={pickForCurrentTab}
          onScoreChange={setScoreForCurrentTab}
        />
      ) : (
        <GlassCard>
          <h3>{activeTab === 'swiss' ? 'Swiss indisponible' : 'Bracket indisponible'}</h3>
          <p>
            {activeTab === 'swiss'
              ? "Ce tournoi n'a pas de structure Swiss publiee dans la source API."
              : "Ce tournoi n'a pas encore de bracket playoffs publie dans la source API."}
          </p>
        </GlassCard>
      )}
    </section>
  )
}
