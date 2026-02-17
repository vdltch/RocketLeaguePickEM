import { useQuery } from '@tanstack/react-query'
import { fetchRlcs2026Tournaments } from '../api/liquipedia'
import { newsItems, tournaments } from '../data/esportData'

export const useTournaments = () =>
  useQuery({
    queryKey: ['tournaments', 'rlcs-2026'],
    queryFn: async () => {
      try {
        const apiTournaments = await fetchRlcs2026Tournaments()
        if (apiTournaments.length > 0) {
          return apiTournaments
        }
      } catch (error) {
        console.error('Erreur API Liquipedia, fallback local active.', error)
      }
      return tournaments
    },
    staleTime: 0,
    refetchOnMount: 'always',
  })

export const useNews = () =>
  useQuery({
    queryKey: ['news'],
    queryFn: async () => newsItems,
  })
