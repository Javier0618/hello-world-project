"use client"

import type React from "react"

import { useRef, useState, useEffect, useCallback, useMemo, memo } from "react"
import { cn } from "@/lib/utils"

interface VirtualizedGridProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  itemHeight: number // Approximate height of each row
  columns: number
  gap?: number
  overscan?: number // Number of extra rows to render above/below viewport
  className?: string
  onEndReached?: () => void
  endReachedThreshold?: number // pixels from bottom to trigger onEndReached
  getItemKey: (item: T, index: number) => string | number
}

function VirtualizedGridInner<T>({
  items,
  renderItem,
  itemHeight,
  columns,
  gap = 8,
  overscan = 3,
  className,
  onEndReached,
  endReachedThreshold = 500,
  getItemKey,
}: VirtualizedGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)
  const endReachedRef = useRef(false)

  // Calculate row count
  const rowCount = Math.ceil(items.length / columns)
  const rowHeight = itemHeight + gap
  const totalHeight = rowCount * rowHeight

  // Calculate visible range
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
  const endRow = Math.min(rowCount, Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan)

  // Get visible items
  const visibleItems = useMemo(() => {
    const visible: { item: T; index: number; row: number; col: number }[] = []

    for (let row = startRow; row < endRow; row++) {
      for (let col = 0; col < columns; col++) {
        const index = row * columns + col
        if (index < items.length) {
          visible.push({ item: items[index], index, row, col })
        }
      }
    }

    return visible
  }, [items, startRow, endRow, columns])

  // Scroll handler with throttling
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return

    const { scrollTop: newScrollTop, scrollHeight, clientHeight } = containerRef.current
    setScrollTop(newScrollTop)

    // Check if near end
    if (onEndReached && !endReachedRef.current) {
      const distanceFromEnd = scrollHeight - (newScrollTop + clientHeight)
      if (distanceFromEnd < endReachedThreshold) {
        endReachedRef.current = true
        onEndReached()
        // Reset after a delay to allow for new items
        setTimeout(() => {
          endReachedRef.current = false
        }, 1000)
      }
    }
  }, [onEndReached, endReachedThreshold])

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setContainerHeight(entry.contentRect.height)
      }
    })

    resizeObserver.observe(containerRef.current)
    setContainerHeight(containerRef.current.clientHeight)

    return () => resizeObserver.disconnect()
  }, [])

  // Reset end reached when items change
  useEffect(() => {
    endReachedRef.current = false
  }, [items.length])

  return (
    <div
      ref={containerRef}
      className={cn("overflow-auto", className)}
      onScroll={handleScroll}
      style={{ contain: "strict" }}
    >
      <div
        style={{
          height: totalHeight,
          position: "relative",
          width: "100%",
        }}
      >
        {visibleItems.map(({ item, index, row, col }) => (
          <div
            key={getItemKey(item, index)}
            style={{
              position: "absolute",
              top: row * rowHeight,
              left: `calc(${(col / columns) * 100}% + ${col > 0 ? gap / 2 : 0}px)`,
              width: `calc(${100 / columns}% - ${(gap * (columns - 1)) / columns}px)`,
              height: itemHeight,
              contain: "layout style paint",
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  )
}

export const VirtualizedGrid = memo(VirtualizedGridInner) as typeof VirtualizedGridInner

// Simple virtualized list for single column
interface VirtualizedListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  itemHeight: number
  overscan?: number
  className?: string
  onEndReached?: () => void
  endReachedThreshold?: number
  getItemKey: (item: T, index: number) => string | number
}

function VirtualizedListInner<T>({
  items,
  renderItem,
  itemHeight,
  overscan = 5,
  className,
  onEndReached,
  endReachedThreshold = 500,
  getItemKey,
}: VirtualizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)
  const endReachedRef = useRef(false)

  const totalHeight = items.length * itemHeight

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan)

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex).map((item, i) => ({
      item,
      index: startIndex + i,
    }))
  }, [items, startIndex, endIndex])

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return

    const { scrollTop: newScrollTop, scrollHeight, clientHeight } = containerRef.current
    setScrollTop(newScrollTop)

    if (onEndReached && !endReachedRef.current) {
      const distanceFromEnd = scrollHeight - (newScrollTop + clientHeight)
      if (distanceFromEnd < endReachedThreshold) {
        endReachedRef.current = true
        onEndReached()
        setTimeout(() => {
          endReachedRef.current = false
        }, 1000)
      }
    }
  }, [onEndReached, endReachedThreshold])

  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setContainerHeight(entry.contentRect.height)
      }
    })

    resizeObserver.observe(containerRef.current)
    setContainerHeight(containerRef.current.clientHeight)

    return () => resizeObserver.disconnect()
  }, [])

  useEffect(() => {
    endReachedRef.current = false
  }, [items.length])

  return (
    <div
      ref={containerRef}
      className={cn("overflow-auto", className)}
      onScroll={handleScroll}
      style={{ contain: "strict" }}
    >
      <div
        style={{
          height: totalHeight,
          position: "relative",
          width: "100%",
        }}
      >
        {visibleItems.map(({ item, index }) => (
          <div
            key={getItemKey(item, index)}
            style={{
              position: "absolute",
              top: index * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight,
              contain: "layout style paint",
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  )
}

export const VirtualizedList = memo(VirtualizedListInner) as typeof VirtualizedListInner
