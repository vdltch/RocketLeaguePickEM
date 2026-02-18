export type Team = {
  id: string
  name: string
  region: 'EU' | 'NA' | 'SAM' | 'MENA' | 'OCE' | 'APAC'
  rank: number
}

export type Match = {
  id: string
  teamA: Team
  teamB: Team
  startUtc: string
  winnerId?: string
}

export type Stage = {
  id: string
  name: string
  matches: Match[]
}

export type Tournament = {
  id: string
  name: string
  location: string
  startDate: string
  endDate: string
  prizePool: string
  stages: Stage[]
  sourceUrl?: string
  bracket?: Bracket
  swissBracket?: Bracket
  swissGroups?: SwissGroup[]
  teamProfiles?: TournamentTeamProfile[]
}

export type NewsItem = {
  id: string
  title: string
  source: string
  date: string
  summary: string
}

export type BracketSlot =
  | {
      type: 'seed'
      label: string
    }
  | {
      type: 'winner' | 'loser'
      fromMatchId: string
    }

export type BracketMatch = {
  id: string
  sourceKey?: string
  scheduledAt?: string
  sideA: BracketSlot
  sideB: BracketSlot
}

export type BracketRound = {
  id: string
  name: string
  matches: BracketMatch[]
}

export type Bracket = {
  rounds: BracketRound[]
}

export type SwissGroupStanding = {
  team: string
  seriesRecord: string
  gameRecord: string
  gameDiff: string
}

export type SwissGroupMatch = {
  id: string
  round: 1 | 2 | 3
  sideA: string
  sideB: string
}

export type SwissGroup = {
  id: string
  name: string
  standings: SwissGroupStanding[]
  matches: SwissGroupMatch[]
}

export type TournamentTeamProfile = {
  team: string
  region: 'EU' | 'NA' | 'SAM' | 'MENA' | 'OCE' | 'APAC' | 'INTL'
  players: string[]
  coaches: string[]
  substitutes?: string[]
}
