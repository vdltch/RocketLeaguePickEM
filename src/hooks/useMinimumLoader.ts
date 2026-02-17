import { useEffect, useRef, useState } from 'react'

export const useMinimumLoader = (isLoading: boolean, minimumMs = 1200) => {
  const [showLoader, setShowLoader] = useState(isLoading)
  const startedAtRef = useRef<number | null>(null)

  useEffect(() => {
    if (isLoading) {
      if (startedAtRef.current === null) {
        startedAtRef.current = Date.now()
      }
      const showTimer = setTimeout(() => setShowLoader(true), 0)
      return () => clearTimeout(showTimer)
    }

    const startedAt = startedAtRef.current
    if (startedAt === null) {
      const hideNowTimer = setTimeout(() => setShowLoader(false), 0)
      return () => clearTimeout(hideNowTimer)
    }

    const elapsed = Date.now() - startedAt
    const wait = Math.max(0, minimumMs - elapsed)
    const timer = setTimeout(() => {
      startedAtRef.current = null
      setShowLoader(false)
    }, wait)

    return () => clearTimeout(timer)
  }, [isLoading, minimumMs])

  return showLoader
}
