const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT'
  body?: unknown
  token?: string | null
}

type AuthResponse = {
  token: string
  user: {
    id: number
    username: string
    email: string
  }
}

export type RemotePick = {
  matchId: string
  winnerSide?: 'A' | 'B'
  scoreA?: number
  scoreB?: number
}

export type LeaderboardEntry = {
  userId: number
  username: string
  points: number
}

export type RemoteResult = {
  matchId: string
  winnerSide?: 'A' | 'B'
  scoreA?: number
  scoreB?: number
}

export type RemoteMatchPoints = {
  matchId: string
  points: number
}

const request = async <T>(path: string, options: ApiOptions = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error((data as { error?: string }).error ?? 'Erreur API')
  }
  return data as T
}

export const registerUser = (payload: { username: string; email: string; password: string }) =>
  request<AuthResponse>('/auth/register', { method: 'POST', body: payload })

export const loginUser = (payload: { email: string; password: string }) =>
  request<AuthResponse>('/auth/login', { method: 'POST', body: payload })

export const getMe = (token: string) => request<{ user: AuthResponse['user'] }>('/auth/me', { token })

export const getUserPicks = (token: string, tournamentId: string, tab: 'swiss' | 'playoffs') =>
  request<{ picks: RemotePick[] }>(
    `/picks?tournamentId=${encodeURIComponent(tournamentId)}&tab=${encodeURIComponent(tab)}`,
    { token },
  )

export const saveUserPicks = (
  token: string,
  payload: {
    tournamentId: string
    tab: 'swiss' | 'playoffs'
    picks: RemotePick[]
  },
) => request<{ ok: boolean }>('/picks', { method: 'PUT', body: payload, token })

export const getLeaderboard = () => request<{ leaderboard: LeaderboardEntry[] }>('/leaderboard')

export const getMatchResults = (tournamentId: string, tab: 'swiss' | 'playoffs') =>
  request<{ results: RemoteResult[] }>(
    `/results?tournamentId=${encodeURIComponent(tournamentId)}&tab=${encodeURIComponent(tab)}`,
  )

export const getUserMatchPoints = (token: string, tournamentId: string, tab: 'swiss' | 'playoffs') =>
  request<{ pointsByMatch: RemoteMatchPoints[] }>(
    `/picks/points?tournamentId=${encodeURIComponent(tournamentId)}&tab=${encodeURIComponent(tab)}`,
    { token },
  )
