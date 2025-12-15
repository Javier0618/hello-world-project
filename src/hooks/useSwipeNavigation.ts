"use client"

import { useEffect, useRef, useCallback } from "react"

interface SwipeNavigationOptions {
  onSwipeLeft: () => void
  onSwipeRight: () => void
  containerRef: React.RefObject<HTMLDivElement>
  totalTabs: number
  currentTabIndex: number
  threshold?: number
}

const SPRING_TRANSITION = "transform 280ms cubic-bezier(0.32, 0.72, 0, 1)"

export const useSwipeNavigation = ({
  onSwipeLeft,
  onSwipeRight,
  containerRef,
  totalTabs,
  currentTabIndex,
  threshold = 50,
}: SwipeNavigationOptions) => {
  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)
  const touchStartTime = useRef<number>(0)
  const currentTranslate = useRef<number>(0)
  const isDragging = useRef<boolean>(false)
  const animationFrameId = useRef<number>(0)

  useEffect(() => {
    currentTranslate.current = -currentTabIndex * 100
  }, [currentTabIndex])

  const applyTransform = useCallback((value: number, withTransition = false) => {
    if (!containerRef.current) return
    
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current)
    }
    
    animationFrameId.current = requestAnimationFrame(() => {
      if (!containerRef.current) return
      containerRef.current.style.transition = withTransition ? SPRING_TRANSITION : "none"
      containerRef.current.style.transform = `translateX(${value}%)`
    })
  }, [containerRef])

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.innerWidth > 768) return

    const target = e.target as HTMLElement
    const isInteractive = target.closest(
      'button, a, input, select, textarea, .embla, .embla__container, [role="button"], [onclick]'
    )
    if (isInteractive) return
    const isInNavbar = target.closest("nav")
    const isInMobileTabs = target.closest("[data-mobile-tabs]")
    if (isInNavbar || isInMobileTabs) return

    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    touchStartTime.current = performance.now()
    isDragging.current = true

    if (containerRef.current) {
      containerRef.current.style.transition = "none"
    }
  }, [containerRef])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current || !containerRef.current) return

    const currentX = e.touches[0].clientX
    const currentY = e.touches[0].clientY
    const diffX = currentX - touchStartX.current
    const diffY = currentY - touchStartY.current

    if (Math.abs(diffY) > Math.abs(diffX) * 0.8 && Math.abs(diffY) > 10) {
      isDragging.current = false
      applyTransform(currentTranslate.current, true)
      return
    }

    const screenWidth = window.innerWidth
    const percentMove = (diffX / screenWidth) * 100
    
    let newTranslate = currentTranslate.current + percentMove

    if (currentTabIndex === 0 && percentMove > 0) {
       newTranslate = currentTranslate.current
    } 
    else if (currentTabIndex === totalTabs - 1 && percentMove < 0) {
       newTranslate = currentTranslate.current
    }

    applyTransform(newTranslate, false)
  }, [containerRef, currentTabIndex, totalTabs, applyTransform])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!isDragging.current || !containerRef.current) return
    isDragging.current = false

    const touchEndX = e.changedTouches[0].clientX
    const diffX = touchEndX - touchStartX.current
    const elapsed = performance.now() - touchStartTime.current
    
    const velocity = Math.abs(diffX) / elapsed
    const isQuickSwipe = velocity > 0.5 && elapsed < 300
    const effectiveThreshold = isQuickSwipe ? threshold * 0.4 : threshold

    let targetIndex = currentTabIndex
    let tabChangeCallback: (() => void) | null = null

    if (Math.abs(diffX) > effectiveThreshold) {
      if (diffX > 0 && currentTabIndex > 0) {
        targetIndex = currentTabIndex - 1
        tabChangeCallback = onSwipeRight
      } else if (diffX < 0 && currentTabIndex < totalTabs - 1) {
        targetIndex = currentTabIndex + 1
        tabChangeCallback = onSwipeLeft
      }
    }

    const targetTranslate = -targetIndex * 100
    
    applyTransform(targetTranslate, true)

    if (tabChangeCallback) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          tabChangeCallback!()
        })
      })
    }
  }, [currentTabIndex, totalTabs, onSwipeRight, onSwipeLeft, threshold, applyTransform])

  useEffect(() => {
    const element = containerRef.current
    if (!element || typeof window === "undefined" || window.innerWidth > 768) return

    element.addEventListener("touchstart", handleTouchStart, { passive: true })
    element.addEventListener("touchmove", handleTouchMove, { passive: false })
    element.addEventListener("touchend", handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener("touchstart", handleTouchStart)
      element.removeEventListener("touchmove", handleTouchMove)
      element.removeEventListener("touchend", handleTouchEnd)
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current)
      }
    }
  }, [containerRef, handleTouchStart, handleTouchMove, handleTouchEnd])
}