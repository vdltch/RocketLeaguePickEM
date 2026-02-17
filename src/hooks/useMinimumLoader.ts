import { useEffect, useRef, useState } from 'react'

export const useMinimumLoader = (isLoading: boolean, minimumMs = 1200) => {
  const [showLoader, setShowLoader] = useState(isLoading)
  const startedAtRef = useRef<number | null>(isLoading ? Date.now() : null)

  useEffect(() => {
    if (isLoading) {
      if (startedAtRef.current === null) {
        startedAtRef.current = Date.now()
      }
      setShowLoader(true)
      return
    }

    const startedAt = startedAtRef.current
    if (startedAt === null) {
      setShowLoader(false)
      return
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
