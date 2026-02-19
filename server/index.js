import 'dotenv/config'
import bcrypt from 'bcryptjs'
import cors from 'cors'
import express from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { initDb } from './db.js'
import { authRequired } from './middleware/auth.js'
import { startResultsSync, syncLiquipediaResults } from './results-sync.js'

const app = express()
const port = Number(process.env.PORT ?? 4000)
const jwtSecret = process.env.JWT_SECRET ?? 'dev-secret-change-me'
const clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173'
const resultsSyncIntervalMs = Number(process.env.RESULTS_SYNC_INTERVAL_MS ?? 120000)

app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  }),
)
app.use(express.json())

const registerSchema = z.object({
  username: z.string().min(2).max(24),
  email: z.email(),
  password: z.string().min(6).max(128),
})

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6).max(128),
})

const picksSchema = z.object({
  tournamentId: z.string().min(1),
  tab: z.enum(['swiss', 'playoffs']),
  picks: z.array(
    z.object({
      matchId: z.string().min(1),
      winnerSide: z.union([z.enum(['A', 'B']), z.null()]).optional(),
      scoreA: z.union([z.number().int().min(0).max(10), z.null()]).optional(),
      scoreB: z.union([z.number().int().min(0).max(10), z.null()]).optional(),
    }),
  ),
})

const resultsSchema = z.object({
  tournamentId: z.string().min(1),
  tab: z.enum(['swiss', 'playoffs']),
  results: z.array(
    z.object({
      matchId: z.string().min(1),
      winnerSide: z.union([z.enum(['A', 'B']), z.null()]).optional(),
      scoreA: z.union([z.number().int().min(0).max(10), z.null()]).optional(),
      scoreB: z.union([z.number().int().min(0).max(10), z.null()]).optional(),
    }),
  ),
})

const tournamentIdAliases = {
  'rlcs-2026-boston-major': 'rlcs-2026-boston-major-1',
  'rlcs-2026-boston-major-1': 'rlcs-2026-boston-major-1',
  'rlcs-2026-paris-major': 'rlcs-2026-paris-major-2',
  'rlcs-2026-paris-major-2': 'rlcs-2026-paris-major-2',
}

const normalizeTournamentId = (tournamentId) => tournamentIdAliases[tournamentId] ?? tournamentId

const tournamentStartDates = {
  'rlcs-2026-boston-major-1': '2026-02-19',
  'rlcs-2026-paris-major-2': '2026-05-20',
}

const getTournamentLockDate = (tournamentId) => {
  const startDate = tournamentStartDates[normalizeTournamentId(tournamentId)]
  if (!startDate) {
    return null
  }
  return new Date(`${startDate}T00:00:00Z`)
}

const isTournamentLocked = (tournamentId) => {
  const lockDate = getTournamentLockDate(tournamentId)
  if (!lockDate) {
    return false
  }
  return Date.now() >= lockDate.getTime()
}

const signToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
    },
    jwtSecret,
    { expiresIn: '30d' },
  )

const db = await initDb()

const recalculateUserPoints = async () => {
  const totals = await db.all(
    `SELECT
      p.user_id as userId,
      SUM(
        CASE
          WHEN p.winner_side = r.winner_side
           AND p.score_a IS NOT NULL
           AND p.score_b IS NOT NULL
           AND r.score_a IS NOT NULL
           AND r.score_b IS NOT NULL
           AND p.score_a = r.score_a
           AND p.score_b = r.score_b
          THEN 10
          WHEN p.winner_side = r.winner_side
          THEN 5
          ELSE 0
        END
      ) as points
     FROM pick_predictions p
     JOIN match_results r
       ON p.tournament_id = r.tournament_id
      AND p.tab = r.tab
      AND p.match_id = r.match_id
     WHERE r.winner_side IN ('A', 'B')
     GROUP BY p.user_id`,
  )

  await db.exec('BEGIN')
  try {
    await db.run('UPDATE users SET points = 0')
    for (const item of totals) {
      await db.run('UPDATE users SET points = ? WHERE id = ?', [Number(item.points ?? 0), item.userId])
    }
    await db.exec('COMMIT')
  } catch (error) {
    await db.exec('ROLLBACK')
    throw error
  }
}

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.post('/api/auth/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Donnees invalides', details: parsed.error.issues })
  }

  const { username, email, password } = parsed.data
  const existing = await db.get('SELECT id FROM users WHERE email = ?', email.toLowerCase())
  if (existing) {
    return res.status(409).json({ error: 'Email deja utilise' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const result = await db.run('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [
    username.trim(),
    email.toLowerCase(),
    passwordHash,
  ])

  const user = await db.get('SELECT id, username, email FROM users WHERE id = ?', result.lastID)
  const token = signToken(user)
  return res.status(201).json({ token, user })
})

app.post('/api/auth/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Donnees invalides', details: parsed.error.issues })
  }

  const { email, password } = parsed.data
  const userRow = await db.get('SELECT id, username, email, password_hash FROM users WHERE email = ?', email.toLowerCase())
  if (!userRow) {
    return res.status(401).json({ error: 'Identifiants invalides' })
  }

  const isValid = await bcrypt.compare(password, userRow.password_hash)
  if (!isValid) {
    return res.status(401).json({ error: 'Identifiants invalides' })
  }

  const user = { id: userRow.id, username: userRow.username, email: userRow.email }
  const token = signToken(user)
  return res.json({ token, user })
})

app.get('/api/auth/me', authRequired(jwtSecret), async (req, res) => {
  const user = await db.get('SELECT id, username, email FROM users WHERE id = ?', req.user.id)
  if (!user) {
    return res.status(404).json({ error: 'Utilisateur introuvable' })
  }
  return res.json({ user })
})

app.get('/api/picks', authRequired(jwtSecret), async (req, res) => {
  const tournamentId = normalizeTournamentId(String(req.query.tournamentId ?? ''))
  const tab = String(req.query.tab ?? '')
  if (!tournamentId || (tab !== 'swiss' && tab !== 'playoffs')) {
    return res.json({ picks: [] })
  }

  const rows = await db.all(
    `SELECT match_id as matchId, winner_side as winnerSide, score_a as scoreA, score_b as scoreB
     FROM pick_predictions
     WHERE user_id = ? AND tournament_id = ? AND tab = ?`,
    [req.user.id, tournamentId, tab],
  )
  return res.json({ picks: rows })
})

app.get('/api/results', async (req, res) => {
  const tournamentId = normalizeTournamentId(String(req.query.tournamentId ?? ''))
  const tab = String(req.query.tab ?? '')
  if (!tournamentId || (tab !== 'swiss' && tab !== 'playoffs')) {
    return res.json({ results: [] })
  }

  const rows = await db.all(
    `SELECT match_id as matchId, winner_side as winnerSide, score_a as scoreA, score_b as scoreB
     FROM match_results
     WHERE tournament_id = ? AND tab = ?`,
    [tournamentId, tab],
  )
  return res.json({ results: rows })
})

app.get('/api/leaderboard', async (_req, res) => {
  await recalculateUserPoints()
  const rows = await db.all(
    `SELECT
      u.id as userId,
      u.username as username,
      u.points as points
     FROM users u
     ORDER BY u.points DESC, u.username ASC`,
  )
  return res.json({ leaderboard: rows })
})

app.put('/api/picks', authRequired(jwtSecret), async (req, res) => {
  const parsed = picksSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Donnees invalides', details: parsed.error.issues })
  }

  const tournamentId = normalizeTournamentId(parsed.data.tournamentId)
  const { tab, picks } = parsed.data
  if (isTournamentLocked(tournamentId)) {
    const lockDate = getTournamentLockDate(tournamentId)
    const isoDate = lockDate ? lockDate.toISOString().slice(0, 10) : tournamentId
    return res.status(423).json({ error: `Pick em verrouille depuis le ${isoDate}` })
  }

  await db.exec('BEGIN')
  try {
    await db.run('DELETE FROM pick_predictions WHERE user_id = ? AND tournament_id = ? AND tab = ?', [
      req.user.id,
      tournamentId,
      tab,
    ])

    for (const pick of picks) {
      if (!pick.winnerSide && pick.scoreA === undefined && pick.scoreB === undefined) {
        continue
      }
      await db.run(
        `INSERT INTO pick_predictions (user_id, tournament_id, tab, match_id, winner_side, score_a, score_b, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [req.user.id, tournamentId, tab, pick.matchId, pick.winnerSide ?? null, pick.scoreA ?? null, pick.scoreB ?? null],
      )
    }

    await db.exec('COMMIT')
    await recalculateUserPoints()
    return res.json({ ok: true })
  } catch (error) {
    await db.exec('ROLLBACK')
    console.error(error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

app.put('/api/results', authRequired(jwtSecret), async (req, res) => {
  const parsed = resultsSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Donnees invalides', details: parsed.error.issues })
  }

  const tournamentId = normalizeTournamentId(parsed.data.tournamentId)
  const { tab, results } = parsed.data
  await db.exec('BEGIN')
  try {
    for (const result of results) {
      if (!result.winnerSide && result.scoreA === undefined && result.scoreB === undefined) {
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
        [tournamentId, tab, result.matchId, result.winnerSide ?? null, result.scoreA ?? null, result.scoreB ?? null],
      )
    }

    await db.exec('COMMIT')
    await recalculateUserPoints()
    return res.json({ ok: true })
  } catch (error) {
    await db.exec('ROLLBACK')
    console.error(error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

app.post('/api/results/sync', authRequired(jwtSecret), async (_req, res) => {
  try {
    const changes = await syncLiquipediaResults(db)
    if (changes > 0) {
      await recalculateUserPoints()
    }
    return res.json({ ok: true, changes })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

startResultsSync({
  db,
  intervalMs: Number.isFinite(resultsSyncIntervalMs) && resultsSyncIntervalMs > 0 ? resultsSyncIntervalMs : 120000,
  onChanges: recalculateUserPoints,
})

app.listen(port, () => {
  console.log(`API demarree sur http://localhost:${port}`)
})
