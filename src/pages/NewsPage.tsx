import { GlassCard } from '../components/ui/GlassCard'
import { useNews } from '../hooks/useEsportData'
import { formatDate } from '../utils/date'

export const NewsPage = () => {
  const newsQuery = useNews()

  if (newsQuery.isLoading) {
    return <p className="status">Chargement des actualites...</p>
  }

  return (
    <section className="page">
      <h1>Actualites Rocket League</h1>
      <div className="stack">
        {newsQuery.data?.map((item) => (
          <GlassCard key={item.id}>
            <div className="row split">
              <h2>{item.title}</h2>
              <small>{formatDate(item.date)}</small>
            </div>
            <p>{item.summary}</p>
            <small>Source: {item.source}</small>
          </GlassCard>
        ))}
      </div>
    </section>
  )
}
