import { useState, useEffect, useMemo } from "react"

export type ScreenType = "mobile" | "desktop"

const BREAKPOINT = 768

export const useScreenSize = () => {
  const [screenType, setScreenType] = useState<ScreenType>(() => {
    if (typeof window === "undefined") return "desktop"
    return window.innerWidth <= BREAKPOINT ? "mobile" : "desktop"
  })

  useEffect(() => {
    const handleResize = () => {
      const newType = window.innerWidth <= BREAKPOINT ? "mobile" : "desktop"
      setScreenType((prev) => (prev !== newType ? newType : prev))
    }

    window.addEventListener("resize", handleResize)

    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return useMemo(() => ({
    screenType,
    isMobile: screenType === "mobile",
    isDesktop: screenType === "desktop",
  }), [screenType])
}

export const shouldShowForScreen = (
  screenVisibility: "all" | "mobile" | "desktop" | null | undefined,
  currentScreenType: ScreenType
): boolean => {
  if (!screenVisibility || screenVisibility === "all") {
    return true
  }
  return screenVisibility === currentScreenType
}
