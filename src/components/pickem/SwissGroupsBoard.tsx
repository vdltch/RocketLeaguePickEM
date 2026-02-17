import clsx from 'clsx'
import type { SwissGroup } from '../../types/esport'

type SwissGroupsBoardProps = {
  groups: SwissGroup[]
  getPrediction: (matchId: string) => 'A' | 'B' | undefined
  getScore: (matchId: string) => { a?: number; b?: number } | undefined
  onPick: (matchId: string, side: 'A' | 'B') => void
  onScoreChange: (matchId: string, side: 'A' | 'B', score?: number) => void
}

const rounds: Array<1 | 2 | 3> = [1, 2, 3]

export const SwissGroupsBoard = ({ groups, getPrediction, getScore, onPick, onScoreChange }: SwissGroupsBoardProps) => (
  <div className="swiss-groups-grid">
    {groups.map((group) => (
      <section key={group.id} className="swiss-group-card">
        <header className="swiss-group-header">
          <h3>{group.name}</h3>
          <span>{group.standings.length} teams</span>
        </header>

        <table className="swiss-standings">
          <thead>
            <tr>
              <th>Team</th>
              <th>Serie</th>
              <th>Games</th>
              <th>Diff</th>
            </tr>
          </thead>
          <tbody>
            {group.standings.map((team) => (
              <tr key={`${group.id}-${team.team}`}>
                <td>{team.team}</td>
                <td>{team.seriesRecord}</td>
                <td>{team.gameRecord}</td>
                <td>{team.gameDiff}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="swiss-rounds">
          {rounds.map((round) => (
            <div key={`${group.id}-round-${round}`} className="swiss-round-block">
              <h4>Round {round}</h4>
              {group.matches
                .filter((match) => match.round === round)
                .map((match) => {
                  const picked = getPrediction(match.id)
                  const score = getScore(match.id)
                  return (
                    <div key={match.id} className="swiss-match-row">
                      <button
                        type="button"
                        className={clsx('swiss-team-btn', picked === 'A' && 'swiss-team-btn-active')}
                        onClick={() => onPick(match.id, 'A')}
                      >
                        {match.sideA}
                      </button>
                      <div className="swiss-center">
                        <small className="match-format">BO5</small>
                        <div className="swiss-score-row">
                          <input
                            className="score-input score-input-tight"
                            type="number"
                            min={0}
                            max={3}
                            placeholder="0"
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
                            className="score-input score-input-tight"
                            type="number"
                            min={0}
                            max={3}
                            placeholder="0"
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
                        <svg viewBox="0 0 80 24" aria-hidden="true" className="swiss-connector">
                          <path d="M1 12h22M57 12h22M22 12h35" />
                          <circle cx="40" cy="12" r="5" />
                        </svg>
                      </div>
                      <button
                        type="button"
                        className={clsx('swiss-team-btn', picked === 'B' && 'swiss-team-btn-active')}
                        onClick={() => onPick(match.id, 'B')}
                      >
                        {match.sideB}
                      </button>
                    </div>
                  )
                })}
            </div>
          ))}
        </div>
      </section>
    ))}
  </div>
)
