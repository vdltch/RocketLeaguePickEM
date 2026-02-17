import 'dotenv/config'
import bcrypt from 'bcryptjs'
import cors from 'cors'
import express from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { initDb } from './db.js'
import { authRequired } from './middleware/auth.js'

const app = express()
const port = Number(process.env.PORT ?? 4000)
const jwtSecret = process.env.JWT_SECRET ?? 'dev-secret-change-me'
const clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173'

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

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.post('/api/auth/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'DonnÈes invalides', details: parsed.error.issues })
  }

  const { username, email, password } = parsed.data
  const existing = await db.get('SELECT id FROM users WHERE email = ?', email.toLowerCase())
  if (existing) {
    return res.status(409).json({ error: 'Email d√©j√† utilis√©' })
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
    return res.status(400).json({ error: 'DonnÈes invalides', details: parsed.error.issues })
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
  const tournamentId = String(req.query.tournamentId ?? '')
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

app.get('/api/leaderboard', async (_req, res) => {
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
    return res.status(400).json({ error: 'DonnÈes invalides', details: parsed.error.issues })
  }

  const { tournamentId, tab, picks } = parsed.data
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
    return res.json({ ok: true })
  } catch (error) {
    await db.exec('ROLLBACK')
    console.error(error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

app.listen(port, () => {
  console.log(`API d√©marr√©e sur http://localhost:${port}`)
})


