import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { open } from 'sqlite'
import sqlite3 from 'sqlite3'

const dataDir = path.resolve('server', 'data')
const dbPath = path.join(dataDir, 'pickem.db')

export const initDb = async () => {
  await mkdir(dataDir, { recursive: true })

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  })

  await db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pick_predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      tournament_id TEXT NOT NULL,
      tab TEXT NOT NULL,
      match_id TEXT NOT NULL,
      winner_side TEXT,
      score_a INTEGER,
      score_b INTEGER,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, tournament_id, tab, match_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `)

  // Backfill for existing databases created before the `points` column existed.
  const columns = await db.all(`PRAGMA table_info(users)`)
  const hasPoints = columns.some((col) => col.name === 'points')
  if (!hasPoints) {
    await db.exec(`ALTER TABLE users ADD COLUMN points INTEGER NOT NULL DEFAULT 0`)
  } else {
    await db.exec(`UPDATE users SET points = 0 WHERE points IS NULL`)
  }

  return db
}
