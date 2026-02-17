import type { Bracket, BracketSlot, Tournament } from '../types/esport'
import { buildSwiss16Bracket } from '../data/bracketTemplates'
import { buildSwissGroupsFromPools, buildSwissGroupsFromTeams, defaultSwissPools } from '../data/swissTemplates'

const API_BASE = 'https://liquipedia.net/rocketleague/api.php'
const RLCS_2026_TITLE = 'Rocket League Championship Series/2026'

type LinksResponse = {
  query?: {
    pages?: Array<{
      title: string
      links?: Array<{ title: string }>
    }>
  }
}

type RevisionsResponse = {
  query?: {
    pages?: Array<{
      title: string
      revisions?: Array<{
        slots?: {
          main?: {
            content?: string
          }
        }
      }>
    }>
  }
}

const buildApiUrl = (params: Record<string, string>) => {
  const url = new URL(API_BASE)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return url.toString()
}

const fetchApi = async <T>(params: Record<string, string>) => {
  const response = await fetch(buildApiUrl(params), {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Liquipedia API error: ${response.status}`)
  }

  return (await response.json()) as T
}

const cleanWikiText = (value: string) =>
  value
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/{{[^{}]*}}/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()

const extractField = (content: string, key: string) => {
  const match = content.match(new RegExp(`\\|${key}\\s*=([^\\n]+)`))
  return match?.[1]?.trim()
}

const titleToId = (title: string) =>
  title
    .toLowerCase()
    .replace(/^rocket league championship series\//, 'rlcs-')
    .replace(/[^\w]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

const extractMatchWindow = (content: string, sourceKey: string) => {
  const start = content.indexOf(`|${sourceKey}={{Match`)
  if (start < 0) {
    return ''
  }
  return content.slice(start, start + 5500)
}

const parseBracketSideLabel = (windowText: string, side: 1 | 2) => {
  const literal = windowText.match(new RegExp(`\\|opponent${side}literal=([^\\n]+)`))?.[1]
  const team = windowText.match(new RegExp(`\\|opponent${side}=\\{\\{TeamOpponent\\|([^|}\\n]+)`))?.[1]
  const raw = literal ?? team ?? ''
  return cleanWikiText(raw) || `TBD ${side}`
}

const parseMatchDate = (windowText: string) => {
  const raw = windowText.match(/\|date=([^\n]+)/)?.[1]
  if (!raw) {
    return undefined
  }
  return cleanWikiText(raw)
}

const makeSeed = (label: string): BracketSlot => ({
  type: 'seed',
  label,
})

const extractTeamsFromWikitext = (content: string) => {
  const matches = [...content.matchAll(/\|team=([^\n|]+)/g)]
  const cleaned = matches
    .map((match) => cleanWikiText(match[1]))
    .filter((name) => name.length > 0 && name.toLowerCase() !== 'tbd')
  return Array.from(new Set(cleaned))
}

const normalizeTeamKey = (value: string) =>
  cleanWikiText(value)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')

const teamAliasMap: Record<string, string> = {
  nrg: 'NRG',
  nip: 'Ninjas in Pyjamas',
  pwr: 'PWR',
  'five fears': 'Five Fears',
  falcons: 'Team Falcons',
  gk: 'Geekay Esports',
  redacted: '[REDACTED]',
  furia: 'FURIA',
  'karmine corp': 'Karmine Corp',
  'team vitality': 'Team Vitality',
  'twisted minds': 'Twisted Minds',
  'spacestation gaming': 'Spacestation Gaming',
  'gentle mates': 'Gentle Mates',
  sr: 'Shopify Rebellion',
  mibr: 'MIBR',
  tsm: 'TSM',
}

const displayTeamName = (token: string) => {
  const normalized = normalizeTeamKey(token)
  if (teamAliasMap[normalized]) {
    return teamAliasMap[normalized]
  }
  const cleaned = cleanWikiText(token).replace(/_/g, ' ').trim()
  if (!cleaned) {
    return 'TBD'
  }
  if (cleaned.toUpperCase() === cleaned && cleaned.length <= 6) {
    return cleaned
  }
  return cleaned
}

const extractGroupPoolsFromWikitext = (content: string) => {
  const letters = ['A', 'B', 'C', 'D']
  const pools = letters.map((letter) => {
    const match = content.match(
      new RegExp(
        `\\|title=Group ${letter}[\\s\\S]*?\\|team1=([^\\n|]+)[\\s\\S]*?\\|team2=([^\\n|]+)[\\s\\S]*?\\|team3=([^\\n|]+)[\\s\\S]*?\\|team4=([^\\n|]+)`,
      ),
    )
    if (!match) {
      return null
    }
    return {
      name: `Group ${letter}`,
      teams: [displayTeamName(match[1]), displayTeamName(match[2]), displayTeamName(match[3]), displayTeamName(match[4])],
    }
  })

  if (pools.some((pool) => pool === null)) {
    return null
  }

  return pools as Array<{ name: string; teams: string[] }>
}

const extractGroupMatchesFromWikitext = (content: string) => {
  const letters = ['A', 'B', 'C', 'D'] as const
  const result: Record<string, Array<{ round: 1 | 2 | 3; sideA: string; sideB: string }>> = {}

  for (const letter of letters) {
    const windowMatch = content.match(
      new RegExp(
        `\\|title=Group ${letter} Matches([\\s\\S]*?)(\\|title=Group [A-D] Matches|\\{\\{box\\|END|===Playoffs===)`,
      ),
    )
    const windowText = windowMatch?.[1] ?? ''
    if (!windowText) {
      continue
    }

    const opponents = [...windowText.matchAll(/\|opponent[12]=\{\{TeamOpponent\|([^|}\n]+)/g)].map((match) =>
      displayTeamName(match[1]),
    )
    if (opponents.length < 12) {
      continue
    }

    const pairs = []
    for (let i = 0; i < 12; i += 2) {
      pairs.push({ sideA: opponents[i], sideB: opponents[i + 1] })
    }

    result[`Group ${letter}`] = [
      { round: 1, ...pairs[0] },
      { round: 1, ...pairs[1] },
      { round: 2, ...pairs[2] },
      { round: 2, ...pairs[3] },
      { round: 3, ...pairs[4] },
      { round: 3, ...pairs[5] },
    ]
  }

  return result
}

const buildMajorBracket = (content: string): Bracket => {
  const required = ['R1M1', 'R1M2', 'R2M1', 'R2M2', 'R2M3', 'R2M4', 'R3M1', 'R3M2', 'R4M1']

  const parsed = Object.fromEntries(
    required.map((key) => {
      const windowText = extractMatchWindow(content, key)
      return [
        key,
        {
          a: parseBracketSideLabel(windowText, 1),
          b: parseBracketSideLabel(windowText, 2),
          date: parseMatchDate(windowText),
        },
      ]
    }),
  )

  return {
    rounds: [
      {
        id: 'lb-r1',
        name: 'Lower Bracket Round 1',
        matches: [
          {
            id: 'lb-r1-m1',
            sourceKey: 'R1M1',
            scheduledAt: parsed.R1M1.date,
            sideA: makeSeed(parsed.R1M1.a),
            sideB: makeSeed(parsed.R1M1.b),
          },
          {
            id: 'lb-r1-m2',
            sourceKey: 'R1M2',
            scheduledAt: parsed.R1M2.date,
            sideA: makeSeed(parsed.R1M2.a),
            sideB: makeSeed(parsed.R1M2.b),
          },
        ],
      },
      {
        id: 'mixed-qf',
        name: 'Upper + Lower Quarterfinals',
        matches: [
          {
            id: 'ub-qf-m1',
            sourceKey: 'R2M1',
            scheduledAt: parsed.R2M1.date,
            sideA: makeSeed(parsed.R2M1.a),
            sideB: makeSeed(parsed.R2M1.b),
          },
          {
            id: 'ub-qf-m2',
            sourceKey: 'R2M2',
            scheduledAt: parsed.R2M2.date,
            sideA: makeSeed(parsed.R2M2.a),
            sideB: makeSeed(parsed.R2M2.b),
          },
          {
            id: 'lb-qf-m1',
            sourceKey: 'R2M3',
            scheduledAt: parsed.R2M3.date,
            sideA: { type: 'winner', fromMatchId: 'lb-r1-m1' },
            sideB: { type: 'loser', fromMatchId: 'ub-qf-m2' },
          },
          {
            id: 'lb-qf-m2',
            sourceKey: 'R2M4',
            scheduledAt: parsed.R2M4.date,
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
            sourceKey: 'R3M1',
            scheduledAt: parsed.R3M1.date,
            sideA: { type: 'winner', fromMatchId: 'lb-qf-m2' },
            sideB: { type: 'winner', fromMatchId: 'ub-qf-m2' },
          },
          {
            id: 'sf-m2',
            sourceKey: 'R3M2',
            scheduledAt: parsed.R3M2.date,
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
            sourceKey: 'R4M1',
            scheduledAt: parsed.R4M1.date,
            sideA: { type: 'winner', fromMatchId: 'sf-m2' },
            sideB: { type: 'winner', fromMatchId: 'sf-m1' },
          },
        ],
      },
    ],
  }
}

const parseTournament = (page: {
  title: string
  revisions?: Array<{ slots?: { main?: { content?: string } } }>
}): Tournament | null => {
  const content = page.revisions?.[0]?.slots?.main?.content
  if (!content) {
    return null
  }

  const name = cleanWikiText(extractField(content, 'name') ?? page.title.split('/').at(-1) ?? page.title)
  const startDate = extractField(content, 'sdate') ?? extractField(content, 'start_date')
  const endDate = extractField(content, 'edate') ?? extractField(content, 'end_date')

  if (!startDate || !endDate || !startDate.startsWith('2026')) {
    return null
  }

  const city = cleanWikiText(extractField(content, 'city') ?? '')
  const country = cleanWikiText(extractField(content, 'country') ?? '')
  const venue = cleanWikiText(extractField(content, 'venue') ?? '')
  const location = [city, country, venue].filter(Boolean).join(', ') || 'TBD'

  const prizePoolUsd = extractField(content, 'prizepoolusd')
  const prizePool =
    prizePoolUsd && /^\d/.test(prizePoolUsd.replace(/,/g, ''))
      ? `$${Number(prizePoolUsd.replace(/,/g, '')).toLocaleString('en-US')}`
      : cleanWikiText(extractField(content, 'prizepool') ?? 'TBD')

  const sourceUrl = `https://liquipedia.net/rocketleague/${page.title.replace(/ /g, '_')}`
  const id = titleToId(page.title)
  const isMajor = /\/(Boston Major|Paris Major)$/.test(page.title)
  const bracket = isMajor ? buildMajorBracket(content) : undefined
  const teamCount = Number((extractField(content, 'team_number') ?? '').replace(/,/g, ''))
  const swissBracket = Number.isFinite(teamCount) && teamCount >= 16 ? buildSwiss16Bracket() : isMajor ? buildSwiss16Bracket() : undefined
  const teams = extractTeamsFromWikitext(content)
  const poolsFromApi = extractGroupPoolsFromWikitext(content)
  const matchesByGroup = extractGroupMatchesFromWikitext(content)
  const swissGroups = poolsFromApi
    ? buildSwissGroupsFromPools(poolsFromApi).map((group) => {
        const exactMatches = matchesByGroup[group.name]
        if (!exactMatches || exactMatches.length < 6) {
          return group
        }
        return {
          ...group,
          matches: exactMatches.map((match, idx) => ({
            id: `${group.name.toLowerCase().replace(/\s+/g, '-')}-r${match.round}-m${idx + 1}`,
            round: match.round,
            sideA: match.sideA,
            sideB: match.sideB,
          })),
        }
      })
    : teams.length >= 16
      ? buildSwissGroupsFromTeams(teams.slice(0, 16))
      : isMajor
        ? buildSwissGroupsFromPools(defaultSwissPools)
        : undefined

  return {
    id,
    name,
    location,
    startDate,
    endDate,
    prizePool,
    stages: [],
    sourceUrl,
    bracket,
    swissBracket,
    swissGroups,
  }
}

export const fetchRlcs2026Tournaments = async () => {
  const linksData = await fetchApi<LinksResponse>({
    action: 'query',
    titles: RLCS_2026_TITLE,
    prop: 'links',
    pllimit: 'max',
    format: 'json',
    formatversion: '2',
    origin: '*',
  })

  const allLinks = linksData.query?.pages?.[0]?.links?.map((link) => link.title) ?? []
  const selectedTitles = new Set<string>([
    RLCS_2026_TITLE,
    ...allLinks.filter((title) =>
      /^Rocket League Championship Series\/2026\/(Kick-Off Weekend|Boston Major|Paris Major|Last Chance Qualifier\/Region \d+)$/.test(
        title,
      ),
    ),
  ])

  const revisionsData = await fetchApi<RevisionsResponse>({
    action: 'query',
    titles: Array.from(selectedTitles).join('|'),
    prop: 'revisions',
    rvprop: 'content',
    rvslots: 'main',
    format: 'json',
    formatversion: '2',
    origin: '*',
  })

  return (revisionsData.query?.pages ?? [])
    .map(parseTournament)
    .filter((item): item is Tournament => item !== null)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
}
