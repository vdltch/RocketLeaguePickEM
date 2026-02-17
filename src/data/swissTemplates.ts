import type { SwissGroup } from '../types/esport'

const groupRoundRobin = (teams: string[]) => [
  { round: 1 as const, sideA: teams[2], sideB: teams[0] },
  { round: 1 as const, sideA: teams[3], sideB: teams[1] },
  { round: 2 as const, sideA: teams[1], sideB: teams[0] },
  { round: 2 as const, sideA: teams[3], sideB: teams[2] },
  { round: 3 as const, sideA: teams[3], sideB: teams[0] },
  { round: 3 as const, sideA: teams[1], sideB: teams[2] },
]

export const buildSwissGroupsFromPools = (pools: Array<{ name: string; teams: string[] }>): SwissGroup[] =>
  pools
    .filter((pool) => pool.teams.length >= 4)
    .map((pool, index) => {
      const groupTeams = pool.teams.slice(0, 4)
      return {
        id: `swiss-group-${String.fromCharCode(97 + index)}`,
        name: pool.name,
        standings: groupTeams.map((team) => ({
          team,
          seriesRecord: '0-0',
          gameRecord: '0-0',
          gameDiff: '0',
        })),
        matches: groupRoundRobin(groupTeams).map((match, idx) => ({
          id: `${pool.name.toLowerCase().replace(/\s+/g, '-')}-r${match.round}-m${idx + 1}`,
          round: match.round,
          sideA: match.sideA,
          sideB: match.sideB,
        })),
      }
    })

export const buildSwissGroupsFromTeams = (teams: string[]): SwissGroup[] => {
  if (teams.length < 16) {
    return []
  }

  return buildSwissGroupsFromPools([
    { name: 'Group A', teams: teams.slice(0, 4) },
    { name: 'Group B', teams: teams.slice(4, 8) },
    { name: 'Group C', teams: teams.slice(8, 12) },
    { name: 'Group D', teams: teams.slice(12, 16) },
  ])
}

export const defaultSwissTeams = [
  'NRG',
  'Ninjas in Pyjamas',
  'PWR',
  'Five Fears',
  'Team Falcons',
  'Geekay Esports',
  '[REDACTED]',
  'FURIA',
  'Karmine Corp',
  'Team Vitality',
  'Twisted Minds',
  'Spacestation Gaming',
  'Gentle Mates',
  'Shopify Rebellion',
  'MIBR',
  'TSM',
]

export const defaultSwissPools = [
  {
    name: 'Group A',
    teams: ['NRG', 'Ninjas in Pyjamas', 'PWR', 'Five Fears'],
  },
  {
    name: 'Group B',
    teams: ['Team Falcons', 'Geekay Esports', '[REDACTED]', 'FURIA'],
  },
  {
    name: 'Group C',
    teams: ['Karmine Corp', 'Team Vitality', 'Twisted Minds', 'Spacestation Gaming'],
  },
  {
    name: 'Group D',
    teams: ['Gentle Mates', 'Shopify Rebellion', 'MIBR', 'TSM'],
  },
]
