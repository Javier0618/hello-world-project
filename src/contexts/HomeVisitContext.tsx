import { createContext, useContext, useState, useCallback, ReactNode } from "react"

const STORAGE_KEY = "home-visited-session"

interface HomeVisitContextType {
  hasVisitedHome: boolean
  markHomeAsVisited: () => void
}

const HomeVisitContext = createContext<HomeVisitContextType>({
  hasVisitedHome: false,
  markHomeAsVisited: () => {},
})

interface HomeVisitProviderProps {
  children: ReactNode
}

const getInitialVisitState = (): boolean => {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem(STORAGE_KEY) === "true"
  }
  return false
}

export function HomeVisitProvider({ children }: HomeVisitProviderProps) {
  const [hasVisitedHome, setHasVisitedHome] = useState(getInitialVisitState)

  const markHomeAsVisited = useCallback(() => {
    setHasVisitedHome(true)
    if (typeof window !== "undefined") {
      sessionStorage.setItem(STORAGE_KEY, "true")
    }
  }, [])

  return (
    <HomeVisitContext.Provider value={{ hasVisitedHome, markHomeAsVisited }}>
      {children}
    </HomeVisitContext.Provider>
  )
}

export function useHomeVisit() {
  return useContext(HomeVisitContext)
}
