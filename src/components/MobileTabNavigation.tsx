"use client"

import type React from "react"
import { useEffect, useRef, useMemo } from "react"
import { cn } from "@/lib/utils"
import { useTabNavigation } from "@/contexts/TabNavigationContext"

export interface Tab {
  id: string
  label: string
  icon?: React.ReactNode
}

interface MobileTabNavigationProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
}

export const MobileTabNavigation = ({ tabs, activeTab, onTabChange }: MobileTabNavigationProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const indicatorRef = useRef<HTMLDivElement>(null)
  
  const { swipeProgress, isDragging } = useTabNavigation()

  const activeIndex = useMemo(() => {
    return tabs.findIndex((tab) => tab.id === activeTab)
  }, [tabs, activeTab])

  // Calculate indicator position based on swipe progress
  useEffect(() => {
    const indicator = indicatorRef.current
    const activeButton = buttonRefs.current.get(activeTab)
    
    if (!indicator || !activeButton) return

    const buttonLeft = activeButton.offsetLeft
    const buttonWidth = activeButton.offsetWidth

    if (isDragging && swipeProgress !== 0) {
      // During swipe: animate indicator towards next/prev tab
      const direction = swipeProgress < 0 ? 1 : -1 // negative progress = swiping left = next tab
      const targetIndex = activeIndex + direction
      
      if (targetIndex >= 0 && targetIndex < tabs.length) {
        const targetButton = buttonRefs.current.get(tabs[targetIndex].id)
        if (targetButton) {
          const targetLeft = targetButton.offsetLeft
          const targetWidth = targetButton.offsetWidth
          
          const progress = Math.abs(swipeProgress)
          const interpolatedLeft = buttonLeft + (targetLeft - buttonLeft) * progress
          const interpolatedWidth = buttonWidth + (targetWidth - buttonWidth) * progress
          
          indicator.style.transition = "none"
          indicator.style.left = `${interpolatedLeft}px`
          indicator.style.width = `${interpolatedWidth}px`
          return
        }
      }
    }
    
    // Default state: snap to active tab
    indicator.style.transition = "left 200ms ease-out, width 200ms ease-out"
    indicator.style.left = `${buttonLeft}px`
    indicator.style.width = `${buttonWidth}px`
  }, [activeTab, activeIndex, swipeProgress, isDragging, tabs])

  useEffect(() => {
    const container = containerRef.current
    const activeButton = buttonRefs.current.get(activeTab)

    if (!container || !activeButton) return

    // Don't center first 2 tabs
    if (activeIndex < 2) {
      container.scrollTo({ left: 0, behavior: "smooth" })
      return
    }

    // Don't center if we're near the end
    const isNearEnd = activeIndex >= tabs.length - 2
    if (isNearEnd) {
      const maxScroll = container.scrollWidth - container.clientWidth
      container.scrollTo({ left: maxScroll, behavior: "smooth" })
      return
    }

    // Center the active tab for middle tabs
    const buttonLeft = activeButton.offsetLeft
    const buttonWidth = activeButton.offsetWidth
    const containerWidth = container.clientWidth

    const scrollPosition = buttonLeft - containerWidth / 2 + buttonWidth / 2

    container.scrollTo({ left: scrollPosition, behavior: "smooth" })
  }, [activeTab, activeIndex, tabs])

  return (
    <div
      data-mobile-tabs
      className="md:hidden sticky top-[64px] z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border"
    >
      <div
        ref={containerRef}
        className="relative flex overflow-x-auto scrollbar-hide [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) {
                buttonRefs.current.set(tab.id, el)
              } else {
                buttonRefs.current.delete(tab.id)
              }
            }}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap",
              "relative flex items-center gap-2",
              activeTab === tab.id
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
        
        {/* Animated indicator */}
        <div
          ref={indicatorRef}
          className="absolute bottom-0 h-0.5 bg-primary"
          style={{ left: 0, width: 0 }}
        />
      </div>
    </div>
  )
}
