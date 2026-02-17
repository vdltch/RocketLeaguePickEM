import type { Bracket } from '../types/esport'

const seed = (label: string) => ({ type: 'seed' as const, label })
const winner = (fromMatchId: string) => ({ type: 'winner' as const, fromMatchId })
const loser = (fromMatchId: string) => ({ type: 'loser' as const, fromMatchId })

export const buildSwiss16Bracket = (): Bracket => ({
  rounds: [
    {
      id: 'swiss-r1',
      name: 'Swiss Round 1 (0-0)',
      matches: [
        { id: 'sw-r1-m1', sideA: seed('Seed 1'), sideB: seed('Seed 16') },
        { id: 'sw-r1-m2', sideA: seed('Seed 8'), sideB: seed('Seed 9') },
        { id: 'sw-r1-m3', sideA: seed('Seed 5'), sideB: seed('Seed 12') },
        { id: 'sw-r1-m4', sideA: seed('Seed 4'), sideB: seed('Seed 13') },
        { id: 'sw-r1-m5', sideA: seed('Seed 3'), sideB: seed('Seed 14') },
        { id: 'sw-r1-m6', sideA: seed('Seed 6'), sideB: seed('Seed 11') },
        { id: 'sw-r1-m7', sideA: seed('Seed 7'), sideB: seed('Seed 10') },
        { id: 'sw-r1-m8', sideA: seed('Seed 2'), sideB: seed('Seed 15') },
      ],
    },
    {
      id: 'swiss-r2',
      name: 'Swiss Round 2 (1-0 / 0-1)',
      matches: [
        { id: 'sw-r2-10-m1', sideA: winner('sw-r1-m1'), sideB: winner('sw-r1-m2') },
        { id: 'sw-r2-10-m2', sideA: winner('sw-r1-m3'), sideB: winner('sw-r1-m4') },
        { id: 'sw-r2-10-m3', sideA: winner('sw-r1-m5'), sideB: winner('sw-r1-m6') },
        { id: 'sw-r2-10-m4', sideA: winner('sw-r1-m7'), sideB: winner('sw-r1-m8') },
        { id: 'sw-r2-01-m1', sideA: loser('sw-r1-m1'), sideB: loser('sw-r1-m2') },
        { id: 'sw-r2-01-m2', sideA: loser('sw-r1-m3'), sideB: loser('sw-r1-m4') },
        { id: 'sw-r2-01-m3', sideA: loser('sw-r1-m5'), sideB: loser('sw-r1-m6') },
        { id: 'sw-r2-01-m4', sideA: loser('sw-r1-m7'), sideB: loser('sw-r1-m8') },
      ],
    },
    {
      id: 'swiss-r3',
      name: 'Swiss Round 3 (2-0 / 1-1 / 0-2)',
      matches: [
        { id: 'sw-r3-20-m1', sideA: winner('sw-r2-10-m1'), sideB: winner('sw-r2-10-m2') },
        { id: 'sw-r3-20-m2', sideA: winner('sw-r2-10-m3'), sideB: winner('sw-r2-10-m4') },
        { id: 'sw-r3-11-m1', sideA: loser('sw-r2-10-m1'), sideB: winner('sw-r2-01-m1') },
        { id: 'sw-r3-11-m2', sideA: loser('sw-r2-10-m2'), sideB: winner('sw-r2-01-m2') },
        { id: 'sw-r3-11-m3', sideA: loser('sw-r2-10-m3'), sideB: winner('sw-r2-01-m3') },
        { id: 'sw-r3-11-m4', sideA: loser('sw-r2-10-m4'), sideB: winner('sw-r2-01-m4') },
        { id: 'sw-r3-02-m1', sideA: loser('sw-r2-01-m1'), sideB: loser('sw-r2-01-m2') },
        { id: 'sw-r3-02-m2', sideA: loser('sw-r2-01-m3'), sideB: loser('sw-r2-01-m4') },
      ],
    },
    {
      id: 'swiss-r4',
      name: 'Swiss Round 4 (2-1 / 1-2)',
      matches: [
        { id: 'sw-r4-21-m1', sideA: loser('sw-r3-20-m1'), sideB: winner('sw-r3-11-m1') },
        { id: 'sw-r4-21-m2', sideA: loser('sw-r3-20-m2'), sideB: winner('sw-r3-11-m2') },
        { id: 'sw-r4-21-m3', sideA: winner('sw-r3-11-m3'), sideB: winner('sw-r3-11-m4') },
        { id: 'sw-r4-12-m1', sideA: winner('sw-r3-02-m1'), sideB: loser('sw-r3-11-m1') },
        { id: 'sw-r4-12-m2', sideA: winner('sw-r3-02-m2'), sideB: loser('sw-r3-11-m2') },
        { id: 'sw-r4-12-m3', sideA: loser('sw-r3-11-m3'), sideB: loser('sw-r3-11-m4') },
      ],
    },
    {
      id: 'swiss-r5',
      name: 'Swiss Round 5 (2-2)',
      matches: [
        { id: 'sw-r5-22-m1', sideA: loser('sw-r4-21-m1'), sideB: winner('sw-r4-12-m1') },
        { id: 'sw-r5-22-m2', sideA: loser('sw-r4-21-m2'), sideB: winner('sw-r4-12-m2') },
        { id: 'sw-r5-22-m3', sideA: loser('sw-r4-21-m3'), sideB: winner('sw-r4-12-m3') },
      ],
    },
  ],
})
