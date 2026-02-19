const LIQUIPEDIA_API_BASE = 'https://liquipedia.net/rocketleague/api.php'

const TOURNAMENT_SOURCES = [
  {
    tournamentId: 'rlcs-2026-boston-major-1',
    liquipediaTitle: 'Rocket League Championship Series/2026/Boston Major',
  },
  {
    tournamentId: 'rlcs-2026-paris-major-2',
    liquipediaTitle: 'Rocket League Championship Series/2026/Paris Major',
  },
]

const PLAYOFF_SOURCE_KEY_TO_MATCH_ID = {
  R1M1: 'lb-r1-m1',
  R1M2: 'lb-r1-m2',
  R2M1: 'ub-qf-m1',
  R2M2: 'ub-qf-m2',
  R2M3: 'lb-qf-m1',
  R2M4: 'lb-qf-m2',
  R3M1: 'sf-m1',
  R3M2: 'sf-m2',
  R4M1: 'gf-m1',
}

const buildApiUrl = (params) => {
  const url = new URL(LIQUIPEDIA_API_BASE)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return url.toString()
}

const fetchTournamentWikitext = async (title) => {
  const response = await fetch(
    buildApiUrl({
      action: 'query',
      titles: title,
      prop: 'revisions',
      rvprop: 'content',
      rvslots: 'main',
      format: 'json',
      formatversion: '2',
      origin: '*',
    }),
    {
      headers: {
        Accept: 'application/json',
      },
    },
  )

  if (!response.ok) {
    throw new Error(`Liquipedia API error (${response.status})`)
  }

  const data = await response.json()
  return data.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content ?? ''
}

const toSeriesScore = (value) => {
  const trimmed = String(value ?? '').trim()
  if (!/^\d+$/.test(trimmed)) {
    return undefined
  }
  return Number(trimmed)
}

const resolveWinnerSide = (scoreA, scoreB) => {
  if (scoreA === undefined || scoreB === undefined || scoreA === scoreB) {
    return undefined
  }
  return scoreA > scoreB ? 'A' : 'B'
}

const parseSwissResults = (content) => {
  const entries = []
  const letters = ['A', 'B', 'C', 'D']
  const marker = [1, 2, 3, 4, 5, 6]

  for (const letter of letters) {
    const sectionMatch = content.match(
      new RegExp(`\\|title=Group ${letter} Matches([\\s\\S]*?)(\\|title=Group [A-D] Matches|===Playoffs===|\\{\\{box\\|END)`),
    )
    const section = sectionMatch?.[1] ?? ''
    if (!section) {
      continue
    }

    const matches = [...section.matchAll(/\|opponent1=\{\{TeamOpponent\|[^\n}]*\|score=([^\n}]*)\}\}\s*\n\s*\|opponent2=\{\{TeamOpponent\|[^\n}]*\|score=([^\n}]*)\}\}/g)]
    for (let idx = 0; idx < matches.length && idx < marker.length; idx += 1) {
      const scoreA = toSeriesScore(matches[idx][1])
      const scoreB = toSeriesScore(matches[idx][2])
      const winnerSide = resolveWinnerSide(scoreA, scoreB)
      if (!winnerSide) {
        continue
      }

      const matchId = `group-${letter.toLowerCase()}-r${idx < 2 ? 1 : idx < 4 ? 2 : 3}-m${idx + 1}`
      entries.push({
        tab: 'swiss',
        matchId,
        winnerSide,
        scoreA,
        scoreB,
      })
    }
  }

  return entries
}

const extractMatchWindow = (content, sourceKey) => {
  const start = content.indexOf(`|${sourceKey}={{Match`)
  if (start < 0) {
    return ''
  }
  return content.slice(start, start + 5500)
}

const parsePlayoffResults = (content) => {
  const entries = []

  for (const [sourceKey, matchId] of Object.entries(PLAYOFF_SOURCE_KEY_TO_MATCH_ID)) {
    const windowText = extractMatchWindow(content, sourceKey)
    if (!windowText) {
      continue
    }

    const lineA = windowText.split('\n').find((line) => line.trimStart().startsWith('|opponent1='))
    const lineB = windowText.split('\n').find((line) => line.trimStart().startsWith('|opponent2='))
    const scoreA = toSeriesScore(lineA?.match(/\|score=([0-9]+)/)?.[1])
    const scoreB = toSeriesScore(lineB?.match(/\|score=([0-9]+)/)?.[1])
    const winnerSide = resolveWinnerSide(scoreA, scoreB)
    if (!winnerSide) {
      continue
    }

    entries.push({
      tab: 'playoffs',
      matchId,
      winnerSide,
      scoreA,
      scoreB,
    })
  }

  return entries
}

const upsertResults = async (db, tournamentId, results) => {
  let changed = 0

  for (const result of results) {
    const current = await db.get(
      `SELECT winner_side as winnerSide, score_a as scoreA, score_b as scoreB
       FROM match_results
       WHERE tournament_id = ? AND tab = ? AND match_id = ?`,
      [tournamentId, result.tab, result.matchId],
    )

    const same =
      current &&
      current.winnerSide === result.winnerSide &&
      current.scoreA === result.scoreA &&
      current.scoreB === result.scoreB

    if (same) {
      continue
    }

    await db.run(
      `INSERT INTO match_results (tournament_id, tab, match_id, winner_side, score_a, score_b, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(tournament_id, tab, match_id)
       DO UPDATE SET
         winner_side = excluded.winner_side,
         score_a = excluded.score_a,
         score_b = excluded.score_b,
         updated_at = CURRENT_TIMESTAMP`,
      [tournamentId, result.tab, result.matchId, result.winnerSide, result.scoreA, result.scoreB],
    )
    changed += 1
  }

  return changed
}

export const syncLiquipediaResults = async (db) => {
  let totalChanges = 0
  for (const source of TOURNAMENT_SOURCES) {
    try {
      const content = await fetchTournamentWikitext(source.liquipediaTitle)
      if (!content) {
        continue
      }

      const swissResults = parseSwissResults(content)
      const playoffsResults = parsePlayoffResults(content)
      const changes = await upsertResults(db, source.tournamentId, [...swissResults, ...playoffsResults])
      totalChanges += changes
    } catch (error) {
      console.error(`[results-sync] ${source.tournamentId}:`, error)
    }
  }
  return totalChanges
}

export const startResultsSync = ({ db, onChanges, intervalMs }) => {
  const run = async () => {
    try {
      const changes = await syncLiquipediaResults(db)
      if (changes > 0) {
        console.log(`[results-sync] ${changes} result(s) updated.`)
        if (onChanges) {
          await onChanges()
        }
      }
    } catch (error) {
      console.error('[results-sync] sync failed:', error)
    }
  }

  run()
  const timer = setInterval(run, intervalMs)
  return () => clearInterval(timer)
}
