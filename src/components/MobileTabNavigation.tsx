"use client"

import type React from "react"
import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

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

  useEffect(() => {
    const container = containerRef.current
    const activeButton = buttonRefs.current.get(activeTab)

    if (!container || !activeButton) return

    const activeIndex = tabs.findIndex((tab) => tab.id === activeTab)

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
  }, [activeTab, tabs])

  return (
    <div
      data-mobile-tabs
      className="md:hidden sticky top-[64px] z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border"
    >
      <div
        ref={containerRef}
        className="flex overflow-x-auto scrollbar-hide [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
              "relative border-b-2 flex items-center gap-2",
              activeTab === tab.id
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground",
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
