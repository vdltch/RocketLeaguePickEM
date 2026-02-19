import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getMatchResults, getUserPicks, saveUserPicks } from '../api/backend'
import { useAuth } from '../auth/auth-context'
import { GlassCard } from '../components/ui/GlassCard'
import { RocketGoalLoader } from '../components/ui/RocketGoalLoader'
import { BracketBoard } from '../components/pickem/BracketBoard'
import { SwissGroupsBoard } from '../components/pickem/SwissGroupsBoard'
import { useMinimumLoader } from '../hooks/useMinimumLoader'
import { useTournaments } from '../hooks/useEsportData'
import { usePickemStore } from '../store/pickemStore'
import { resolveTeamProfile } from '../data/teamProfiles'
import type { TournamentTeamProfile } from '../types/esport'
import type { RemoteResult } from '../api/backend'

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
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error' | 'locked'>('idle')
  const [matchResults, setMatchResults] = useState<Record<string, RemoteResult>>({})
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
  const isTournamentLocked = useMemo(() => {
    if (!tournament?.startDate) {
      return false
    }
    const lockDate = new Date(`${tournament.startDate}T00:00:00Z`)
    return Date.now() >= lockDate.getTime()
  }, [tournament?.startDate])
  const tournamentTeams = useMemo(() => {
    if (!tournament) {
      return []
    }

    const seen = new Set<string>()
    const ordered: string[] = []
    const add = (name: string) => {
      if (!name || name.toLowerCase() === 'tbd' || seen.has(name)) {
        return
      }
      seen.add(name)
      ordered.push(name)
    }

    for (const group of tournament.swissGroups ?? []) {
      for (const standing of group.standings) {
        add(standing.team)
      }
    }

    for (const stage of tournament.stages) {
      for (const match of stage.matches) {
        add(match.teamA.name)
        add(match.teamB.name)
      }
    }

    return ordered
  }, [tournament])
  const tournamentTeamProfiles = useMemo(() => {
    const normalize = (value: string) =>
      value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()

    const map = new Map<string, TournamentTeamProfile>()
    for (const item of tournament?.teamProfiles ?? []) {
      map.set(normalize(item.team), item)
    }
    return {
      get: (teamName: string) => map.get(normalize(teamName)),
    }
  }, [tournament?.teamProfiles])

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
  const getMatchPoints = (matchId: string) => {
    const result = matchResults[matchId]
    if (!result?.winnerSide) {
      return undefined
    }

    const scoped = toScopedId(activeTab, matchId)
    const predictedWinner = bracketPredictions[scoped]
    if (!predictedWinner || predictedWinner !== result.winnerSide) {
      return 0
    }

    const predictedScore = bracketScorePredictions[scoped]
    if (
      predictedScore?.a !== undefined &&
      predictedScore?.b !== undefined &&
      result.scoreA !== undefined &&
      result.scoreB !== undefined &&
      predictedScore.a === result.scoreA &&
      predictedScore.b === result.scoreB
    ) {
      return 10
    }

    return 5
  }
  const pickForCurrentTab = (matchId: string, side: 'A' | 'B') => {
    if (isTournamentLocked) {
      return
    }
    pickBracketWinner(toScopedId(activeTab, matchId), side)
  }
  const setScoreForCurrentTab = (matchId: string, side: 'A' | 'B', score?: number) => {
    if (isTournamentLocked) {
      return
    }
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
    const loadResults = async () => {
      if (!selectedTournamentId) {
        setMatchResults({})
        return
      }

      try {
        const remote = await getMatchResults(selectedTournamentId, activeTab)
        const nextMap: Record<string, RemoteResult> = {}
        for (const item of remote.results) {
          nextMap[item.matchId] = item
        }
        setMatchResults(nextMap)
      } catch {
        setMatchResults({})
      }
    }
    loadResults()
  }, [activeTab, selectedTournamentId])

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
    if (!isAuthenticated || !token || !selectedTournamentId || isHydratingRef.current || isTournamentLocked) {
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
      } catch (error) {
        if (error instanceof Error && error.message.toLowerCase().includes('verrouille')) {
          setSyncStatus('locked')
        } else {
          setSyncStatus('error')
        }
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [
    activeMatchIds,
    activeTab,
    bracketPredictions,
    bracketScorePredictions,
    isAuthenticated,
    isTournamentLocked,
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
          {isTournamentLocked ? <small>Pick em verrouille depuis le debut du tournoi.</small> : null}
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
            disabled={isTournamentLocked}
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

      {tournamentTeams.length > 0 ? (
        <GlassCard>
          <div className="row split">
            <div>
              <h3>Teams du tournoi selectionne</h3>
              <p>{tournamentTeams.length} equipes detectees pour ce tournoi 2026.</p>
            </div>
          </div>

          <div className="pickem-teams-grid">
            {tournamentTeams.map((teamName) => {
              const profile = resolveTeamProfile(teamName)
              const liveProfile = tournamentTeamProfiles.get(teamName)
              const players: string[] = liveProfile?.players?.length ? liveProfile.players : profile.players
              const coaches: string[] = liveProfile?.coaches?.length ? liveProfile.coaches : [profile.coach]
              const substitutes: string[] = liveProfile?.substitutes?.length ? liveProfile.substitutes : []
              const region = liveProfile?.region ?? profile.region
              return (
                <article key={teamName} className="pickem-team-card" tabIndex={0}>
                  <div
                    className="pickem-team-logo"
                    style={{ background: `linear-gradient(140deg, ${profile.logoFrom}, ${profile.logoTo})` }}
                  >
                    {profile.logoUrl ? (
                      <img
                        src={profile.logoUrl}
                        alt={`Logo ${teamName}`}
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <span>{profile.logoText}</span>
                    )}
                  </div>
                  <div className="pickem-team-main">
                    <strong>{teamName}</strong>
                    <p>
                      {region} - Coach: {coaches.join(', ')}
                    </p>
                  </div>
                  <div className="pickem-team-hover-panel">
                    <h4>Joueurs</h4>
                    <p>{players.join(' • ')}</p>
                    {substitutes.length > 0 ? <p>Sub: {substitutes.join(' • ')}</p> : null}
                    <p>Coach: {coaches.join(', ')}</p>
                  </div>
                </article>
              )
            })}
          </div>
        </GlassCard>
      ) : null}

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
          getMatchPoints={getMatchPoints}
          onPick={pickForCurrentTab}
          onScoreChange={setScoreForCurrentTab}
          disabled={isTournamentLocked}
        />
      ) : activeBracket ? (
        <BracketBoard
          bracket={activeBracket}
          getPrediction={getPrediction}
          getScore={getScore}
          getMatchPoints={getMatchPoints}
          onPick={pickForCurrentTab}
          onScoreChange={setScoreForCurrentTab}
          disabled={isTournamentLocked}
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
