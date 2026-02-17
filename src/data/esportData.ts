import type { NewsItem, Tournament } from '../types/esport'
import { buildSwiss16Bracket } from './bracketTemplates'
import { buildSwissGroupsFromPools, defaultSwissPools } from './swissTemplates'

const teams = {
  kc: { id: 'kc', name: 'Karmine Corp', region: 'EU', rank: 1 },
  bds: { id: 'bds', name: 'Team BDS', region: 'EU', rank: 2 },
  vit: { id: 'vit', name: 'Team Vitality', region: 'EU', rank: 3 },
  geng: { id: 'geng', name: 'Gen.G Mobil1 Racing', region: 'NA', rank: 4 },
  g2: { id: 'g2', name: 'G2 Stride', region: 'NA', rank: 5 },
  fal: { id: 'fal', name: 'Team Falcons', region: 'MENA', rank: 6 },
  fur: { id: 'fur', name: 'FURIA', region: 'SAM', rank: 7 },
  pwr: { id: 'pwr', name: 'PWR', region: 'OCE', rank: 8 },
} as const

export const tournaments: Tournament[] = [
  {
    id: 'rlcs-2026-boston-major-1',
    name: 'RLCS 2026 Boston Major 1',
    location: 'Boston, USA (Agganis Arena)',
    startDate: '2026-02-19',
    endDate: '2026-02-22',
    prizePool: '$354,000',
    stages: [
      {
        id: 'group-stage-round-1',
        name: 'Group Stage - Jour 1',
        matches: [
          { id: 'm1', teamA: teams.kc, teamB: teams.pwr, startUtc: '2026-02-19T15:00:00Z' },
          { id: 'm2', teamA: teams.g2, teamB: teams.fur, startUtc: '2026-02-19T16:00:00Z' },
          { id: 'm3', teamA: teams.bds, teamB: teams.fal, startUtc: '2026-02-19T17:00:00Z' },
          { id: 'm4', teamA: teams.vit, teamB: teams.geng, startUtc: '2026-02-19T18:00:00Z' },
        ],
      },
      {
        id: 'playoffs',
        name: 'Playoffs - Jour 3/4',
        matches: [
          { id: 'm5', teamA: teams.kc, teamB: teams.g2, startUtc: '2026-02-21T19:00:00Z' },
          { id: 'm6', teamA: teams.fal, teamB: teams.geng, startUtc: '2026-02-21T20:00:00Z' },
        ],
      },
    ],
    sourceUrl: 'https://liquipedia.net/rocketleague/Rocket_League_Championship_Series/2026/Boston_Major',
    bracket: {
      rounds: [
        {
          id: 'lb-r1',
          name: 'Lower Bracket Round 1',
          matches: [
            {
              id: 'lb-r1-m1',
              sideA: { type: 'seed', label: '2nd Place Group C' },
              sideB: { type: 'seed', label: '2nd Place Group B' },
            },
            {
              id: 'lb-r1-m2',
              sideA: { type: 'seed', label: '2nd Place Group D' },
              sideB: { type: 'seed', label: '2nd Place Group A' },
            },
          ],
        },
        {
          id: 'mixed-qf',
          name: 'Upper + Lower Quarterfinals',
          matches: [
            {
              id: 'ub-qf-m1',
              sideA: { type: 'seed', label: '1st Place Group A' },
              sideB: { type: 'seed', label: '1st Place Group D' },
            },
            {
              id: 'ub-qf-m2',
              sideA: { type: 'seed', label: '1st Place Group B' },
              sideB: { type: 'seed', label: '1st Place Group C' },
            },
            {
              id: 'lb-qf-m1',
              sideA: { type: 'winner', fromMatchId: 'lb-r1-m1' },
              sideB: { type: 'loser', fromMatchId: 'ub-qf-m2' },
            },
            {
              id: 'lb-qf-m2',
              sideA: { type: 'winner', fromMatchId: 'lb-r1-m2' },
              sideB: { type: 'loser', fromMatchId: 'ub-qf-m1' },
            },
          ],
        },
        {
          id: 'semis',
          name: 'Semifinals',
          matches: [
            {
              id: 'sf-m1',
              sideA: { type: 'winner', fromMatchId: 'lb-qf-m2' },
              sideB: { type: 'winner', fromMatchId: 'ub-qf-m2' },
            },
            {
              id: 'sf-m2',
              sideA: { type: 'winner', fromMatchId: 'lb-qf-m1' },
              sideB: { type: 'winner', fromMatchId: 'ub-qf-m1' },
            },
          ],
        },
        {
          id: 'grand-final',
          name: 'Grand Final',
          matches: [
            {
              id: 'gf-m1',
              sideA: { type: 'winner', fromMatchId: 'sf-m2' },
              sideB: { type: 'winner', fromMatchId: 'sf-m1' },
            },
          ],
        },
      ],
    },
    swissBracket: buildSwiss16Bracket(),
    swissGroups: buildSwissGroupsFromPools(defaultSwissPools),
  },
  {
    id: 'rlcs-2026-paris-major-2',
    name: 'RLCS 2026 Paris Major 2',
    location: 'Paris La Defense Arena, France',
    startDate: '2026-05-20',
    endDate: '2026-05-24',
    prizePool: '$354,000',
    stages: [
      {
        id: 'major-2-groups',
        name: 'Group Stage',
        matches: [
          { id: 'm7', teamA: teams.bds, teamB: teams.fur, startUtc: '2026-05-20T14:00:00Z' },
          { id: 'm8', teamA: teams.vit, teamB: teams.pwr, startUtc: '2026-05-20T15:00:00Z' },
        ],
      },
    ],
    sourceUrl: 'https://liquipedia.net/rocketleague/Rocket_League_Championship_Series/2026/Paris_Major',
    swissBracket: buildSwiss16Bracket(),
    swissGroups: buildSwissGroupsFromPools(defaultSwissPools),
  },
]

export const newsItems: NewsItem[] = [
  {
    id: 'n1',
    title: 'Karmine Corp domine la fin de split EU',
    source: 'RocketReport',
    date: '2026-02-10',
    summary: 'KCorp enchaine trois top 1 regionaux et arrive favorite pour le Major.',
  },
  {
    id: 'n2',
    title: 'Falcons signe un nouveau coach analytique',
    source: 'Octane Pulse',
    date: '2026-02-07',
    summary: 'Le staff MENA se renforce pour stabiliser la performance en LAN.',
  },
  {
    id: 'n3',
    title: 'Format Pick’em mis a jour pour la saison 2026',
    source: 'RL Esports Digest',
    date: '2026-02-01',
    summary: 'Plus de poids sur les upsets et bonus de precision par stage.',
  },
]
