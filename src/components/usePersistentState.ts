import { useEffect, useRef, useState } from 'react'

/** localStorage-backed state; SSR-safe (reads only after mount). */
export function usePersistentState<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  const [value, setValue] = useState<T>(initial)
  const [loaded, setLoaded] = useState(false)
  const first = useRef(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw != null) setValue(JSON.parse(raw) as T)
    } catch {
      // ignore corrupt storage
    }
    setLoaded(true)
  }, [key])

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (!loaded) return
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // quota / private mode — ignore
    }
  }, [key, value, loaded])

  return [value, setValue, loaded]
}
