export type TeamProfile = {
  name: string
  region: 'EU' | 'NA' | 'SAM' | 'MENA' | 'OCE' | 'APAC' | 'INTL'
  coach: string
  players: string[]
  logoUrl?: string
  logoText: string
  logoFrom: string
  logoTo: string
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const baseProfiles: TeamProfile[] = [
  {
    name: 'Team BDS',
    region: 'EU',
    coach: 'Mew',
    players: ['M0nkey M00n', 'ExoTiiK', 'dralii'],
    logoUrl: '/team-logos/team-bds.png',
    logoText: 'BDS',
    logoFrom: '#7e8ca8',
    logoTo: '#30394f',
  },
  {
    name: 'Gen.G Mobil1 Racing',
    region: 'NA',
    coach: 'Chrome',
    players: ['Firstkiller', 'ApparentlyJack', 'Chronic'],
    logoUrl: '/team-logos/gen-g.png',
    logoText: 'GENG',
    logoFrom: '#f5f7ff',
    logoTo: '#7d859f',
  },
  {
    name: 'G2 Stride',
    region: 'NA',
    coach: 'Satthew',
    players: ['Atomic', 'Daniel', 'BeastMode'],
    logoUrl: '/team-logos/g2-stride.png',
    logoText: 'G2',
    logoFrom: '#f5f5f5',
    logoTo: '#9ca3af',
  },
  {
    name: 'NRG',
    region: 'NA',
    coach: 'Satthew',
    players: ['Atomic', 'BeastMode', 'Daniel'],
    logoUrl: '/team-logos/nrg.png',
    logoText: 'NRG',
    logoFrom: '#ff7b39',
    logoTo: '#ffcd42',
  },
  {
    name: 'Ninjas in Pyjamas',
    region: 'EU',
    coach: 'LBP',
    players: ['Joreuz', 'crr', 'oaly.'],
    logoUrl: '/team-logos/ninjas-in-pyjamas.png',
    logoText: 'NIP',
    logoFrom: '#dbff00',
    logoTo: '#6eff00',
  },
  {
    name: 'PWR',
    region: 'OCE',
    coach: 'FreaKii',
    players: ['gus', 'Fiberr', 'Superlachie'],
    logoUrl: '/team-logos/pwr.png',
    logoText: 'PWR',
    logoFrom: '#ffe100',
    logoTo: '#ff9b00',
  },
  {
    name: 'Five Fears',
    region: 'INTL',
    coach: 'cpZebra',
    players: ['tehqoz', 'Snowyy', 'gunz'],
    logoUrl: '/team-logos/five-fears.png',
    logoText: '5F',
    logoFrom: '#ff6767',
    logoTo: '#7c0e0e',
  },
  {
    name: 'Team Falcons',
    region: 'MENA',
    coach: 'd7oom-24',
    players: ['Rw9', 'Kiileerrz', 'dralii'],
    logoUrl: '/team-logos/team-falcons.png',
    logoText: 'FLC',
    logoFrom: '#33f0b5',
    logoTo: '#129c7b',
  },
  {
    name: 'Geekay Esports',
    region: 'EU',
    coach: 'eekso',
    players: ['Joyo', 'ApparentlyJack', 'Seikoo'],
    logoUrl: '/team-logos/geekay-esports.png',
    logoText: 'GK',
    logoFrom: '#ffe55c',
    logoTo: '#a78b00',
  },
  {
    name: '[REDACTED]',
    region: 'NA',
    coach: 'Memory',
    players: ['2Piece', 'Tawk', 'Wahvey'],
    logoUrl: '/team-logos/redacted.svg',
    logoText: 'RED',
    logoFrom: '#d9d9d9',
    logoTo: '#6d6d6d',
  },
  {
    name: 'FURIA',
    region: 'SAM',
    coach: 'brunovisqui',
    players: ['yANXNZ', 'Lostt.', 'swiftt.'],
    logoUrl: '/team-logos/furia.png',
    logoText: 'FUR',
    logoFrom: '#fefefe',
    logoTo: '#a0a0a0',
  },
  {
    name: 'Karmine Corp',
    region: 'EU',
    coach: 'Extra, Jordi',
    players: ['Vatira', 'Atow.', 'juicy'],
    logoUrl: '/team-logos/karmine-corp.png',
    logoText: 'KC',
    logoFrom: '#39d3ff',
    logoTo: '#1769ff',
  },
  {
    name: 'Team Vitality',
    region: 'EU',
    coach: 'Eversax, Hugo',
    players: ['zen', 'ExoTiiK', 'stizzy'],
    logoUrl: '/team-logos/team-vitality.png',
    logoText: 'VIT',
    logoFrom: '#fff35c',
    logoTo: '#ffc43b',
  },
  {
    name: 'Twisted Minds',
    region: 'MENA',
    coach: 'Sadjunior',
    players: ['Nwpo', 'M0nkey M00n', 'trk511'],
    logoUrl: '/team-logos/twisted-minds.png',
    logoText: 'TW',
    logoFrom: '#ff6f9c',
    logoTo: '#b31243',
  },
  {
    name: 'Spacestation Gaming',
    region: 'NA',
    coach: 'Xpere',
    players: ['Chronic', 'diaz', 'reveal'],
    logoUrl: '/team-logos/spacestation-gaming.png',
    logoText: 'SSG',
    logoFrom: '#f5c04e',
    logoTo: '#7d5316',
  },
  {
    name: 'Gentle Mates',
    region: 'EU',
    coach: 'Snaski',
    players: ['Archie', 'nass', 'Oski'],
    logoUrl: '/team-logos/gentle-mates.png',
    logoText: 'M8',
    logoFrom: '#d2d2d2',
    logoTo: '#666666',
  },
  {
    name: 'Shopify Rebellion',
    region: 'NA',
    coach: 'ViolentPanda',
    players: ['Firstkiller', 'kofyr', 'Lj'],
    logoUrl: '/team-logos/shopify-rebellion.png',
    logoText: 'SR',
    logoFrom: '#f4f4f4',
    logoTo: '#8a8a8a',
  },
  {
    name: 'MIBR',
    region: 'SAM',
    coach: 'pekitas',
    players: ['Sad', 'Reysbull', 'Aztro'],
    logoUrl: '/team-logos/mibr.png',
    logoText: 'MIBR',
    logoFrom: '#ffffff',
    logoTo: '#8d8d8d',
  },
  {
    name: 'TSM',
    region: 'APAC',
    coach: 'trill.',
    players: ['Catalysm', 'Kevin', 'Sphinx'],
    logoUrl: '/team-logos/tsm.png',
    logoText: 'TSM',
    logoFrom: '#f5f5f5',
    logoTo: '#7c7c7c',
  },
]

const profileByName = new Map(baseProfiles.map((team) => [normalize(team.name), team]))
const aliasToName = new Map<string, string>([
  ['gen g', 'Gen.G Mobil1 Racing'],
  ['gen g mobil1 racing', 'Gen.G Mobil1 Racing'],
  ['g2', 'G2 Stride'],
  ['bds', 'Team BDS'],
  ['shopify rebellion rl', 'Shopify Rebellion'],
])

export const resolveTeamProfile = (name: string): TeamProfile => {
  const normalized = normalize(name)
  const key = normalize(aliasToName.get(normalized) ?? name)
  const exact = profileByName.get(key)
  if (exact) {
    return exact
  }

  return {
    name,
    region: 'INTL',
    coach: 'A venir',
    players: ['Roster en attente de publication'],
    logoText: name
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 4)
      .toUpperCase(),
    logoFrom: '#4ec8ff',
    logoTo: '#4c52ff',
  }
}
