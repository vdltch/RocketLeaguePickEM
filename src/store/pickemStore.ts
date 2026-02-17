import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Predictions = Record<string, string>
type BracketPredictions = Record<string, 'A' | 'B'>
type BracketScorePredictions = Record<string, { a?: number; b?: number }>

type PickemState = {
  username: string
  predictions: Predictions
  bracketPredictions: BracketPredictions
  bracketScorePredictions: BracketScorePredictions
  setUsername: (value: string) => void
  pickWinner: (matchId: string, teamId: string) => void
  pickBracketWinner: (matchId: string, side: 'A' | 'B') => void
  setBracketScore: (matchId: string, side: 'A' | 'B', score?: number) => void
  clearTournamentPredictions: (matchIds: string[]) => void
  clearBracketPredictions: (matchIds: string[]) => void
  clearBracketScores: (matchIds: string[]) => void
}

export const usePickemStore = create<PickemState>()(
  persist(
    (set) => ({
      username: 'Vince',
      predictions: {},
      bracketPredictions: {},
      bracketScorePredictions: {},
      setUsername: (value) => set({ username: value.trim() || 'Joueur RL' }),
      pickWinner: (matchId, teamId) =>
        set((state) => ({
          predictions: {
            ...state.predictions,
            [matchId]: teamId,
          },
        })),
      pickBracketWinner: (matchId, side) =>
        set((state) => ({
          bracketPredictions: {
            ...state.bracketPredictions,
            [matchId]: side,
          },
        })),
      setBracketScore: (matchId, side, score) =>
        set((state) => {
          const current = state.bracketScorePredictions[matchId] ?? {}
          return {
            bracketScorePredictions: {
              ...state.bracketScorePredictions,
              [matchId]: {
                ...current,
                [side === 'A' ? 'a' : 'b']: score,
              },
            },
          }
        }),
      clearTournamentPredictions: (matchIds) =>
        set((state) => {
          const next = { ...state.predictions }
          for (const id of matchIds) {
            delete next[id]
          }
          return { predictions: next }
        }),
      clearBracketPredictions: (matchIds) =>
        set((state) => {
          const next = { ...state.bracketPredictions }
          for (const id of matchIds) {
            delete next[id]
          }
          return { bracketPredictions: next }
        }),
      clearBracketScores: (matchIds) =>
        set((state) => {
          const next = { ...state.bracketScorePredictions }
          for (const id of matchIds) {
            delete next[id]
          }
          return { bracketScorePredictions: next }
        }),
    }),
    { name: 'rl-pickem-store' },
  ),
)
