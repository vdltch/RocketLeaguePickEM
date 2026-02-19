import clsx from 'clsx'
import type { Bracket, BracketMatch, BracketRound, BracketSlot } from '../../types/esport'

type BracketBoardProps = {
  bracket: Bracket
  getPrediction: (matchId: string) => 'A' | 'B' | undefined
  getScore: (matchId: string) => { a?: number; b?: number } | undefined
  getMatchPoints: (matchId: string) => number | undefined
  onPick: (matchId: string, side: 'A' | 'B') => void
  onScoreChange: (matchId: string, side: 'A' | 'B', score?: number) => void
  disabled?: boolean
}

const flattenMatches = (rounds: BracketRound[]) =>
  rounds.flatMap((round) => round.matches).reduce<Record<string, BracketMatch>>((acc, match) => {
    acc[match.id] = match
    return acc
  }, {})

const resolveSlotLabel = (
  slot: BracketSlot,
  matchMap: Record<string, BracketMatch>,
  getPrediction: (matchId: string) => 'A' | 'B' | undefined,
  depth = 0,
): string => {
  if (slot.type === 'seed') {
    return slot.label
  }

  if (depth > 8) {
    return 'TBD'
  }

  const parent = matchMap[slot.fromMatchId]
  if (!parent) {
    return 'TBD'
  }

  const picked = getPrediction(parent.id)
  if (!picked) {
    return slot.type === 'winner' ? `Winner ${parent.sourceKey ?? parent.id}` : `Loser ${parent.sourceKey ?? parent.id}`
  }

  const pickedSlot = picked === 'A' ? parent.sideA : parent.sideB
  if (slot.type === 'winner') {
    return resolveSlotLabel(pickedSlot, matchMap, getPrediction, depth + 1)
  }

  const oppositeSlot = picked === 'A' ? parent.sideB : parent.sideA
  return resolveSlotLabel(oppositeSlot, matchMap, getPrediction, depth + 1)
}

export const BracketBoard = ({
  bracket,
  getPrediction,
  getScore,
  getMatchPoints,
  onPick,
  onScoreChange,
  disabled = false,
}: BracketBoardProps) => {
  const matchMap = flattenMatches(bracket.rounds)

  return (
    <div className="bracket-board">
      {bracket.rounds.map((round) => (
        <section key={round.id} className="bracket-round">
          <h3>{round.name}</h3>
          <div className="bracket-matches">
            {round.matches.map((match) => {
              const sideALabel = resolveSlotLabel(match.sideA, matchMap, getPrediction)
              const sideBLabel = resolveSlotLabel(match.sideB, matchMap, getPrediction)
              const picked = getPrediction(match.id)
              const score = getScore(match.id)
              const points = getMatchPoints(match.id)

              return (
                <article key={match.id} className="bracket-match">
                  {points !== undefined ? <small className="match-points">+{points} pts</small> : null}
                  <button
                    type="button"
                    className={clsx('bracket-team', picked === 'A' && 'bracket-team-active')}
                    disabled={disabled}
                    onClick={() => onPick(match.id, 'A')}
                  >
                    {sideALabel}
                  </button>
                  <button
                    type="button"
                    className={clsx('bracket-team', picked === 'B' && 'bracket-team-active')}
                    disabled={disabled}
                    onClick={() => onPick(match.id, 'B')}
                  >
                    {sideBLabel}
                  </button>
                  <div className="bracket-score-row">
                    <input
                      className="score-input"
                      type="number"
                      min={0}
                      max={4}
                      placeholder="0"
                      disabled={disabled}
                      value={score?.a ?? ''}
                      onChange={(event) =>
                        onScoreChange(
                          match.id,
                          'A',
                          event.target.value === '' ? undefined : Number(event.target.value),
                        )
                      }
                    />
                    <span>:</span>
                    <input
                      className="score-input"
                      type="number"
                      min={0}
                      max={4}
                      placeholder="0"
                      disabled={disabled}
                      value={score?.b ?? ''}
                      onChange={(event) =>
                        onScoreChange(
                          match.id,
                          'B',
                          event.target.value === '' ? undefined : Number(event.target.value),
                        )
                      }
                    />
                  </div>
                  {match.scheduledAt ? <small>{match.scheduledAt}</small> : null}
                </article>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
