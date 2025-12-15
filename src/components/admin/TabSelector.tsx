"use client"

import { useQuery } from "@tanstack/react-query"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { getTabSections } from "@/lib/sectionQueries"
import { Folder } from "lucide-react"

interface TabSelectorProps {
  selectedTabs: string[]
  onTabsChange: (tabs: string[]) => void
}

export const TabSelector = ({ selectedTabs, onTabsChange }: TabSelectorProps) => {
  const { data: tabSections, isLoading } = useQuery({
    queryKey: ["tabSections"],
    queryFn: getTabSections,
  })

  const customTabs = tabSections?.filter((section) => section.type === "custom") || []

  const handleToggle = (tabId: string) => {
    if (selectedTabs.includes(tabId)) {
      onTabsChange(selectedTabs.filter((id) => id !== tabId))
    } else {
      onTabsChange([...selectedTabs, tabId])
    }
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Cargando pestañas...</div>
  }

  if (customTabs.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <Label>Agregar a Pestañas Personalizadas</Label>
      <div className="grid grid-cols-2 gap-3">
        {customTabs.map((tab) => (
          <div
            key={tab.id}
            className="flex items-center gap-3 p-2 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => handleToggle(tab.id)}
          >
            <Checkbox
              id={`tab-${tab.id}`}
              checked={selectedTabs.includes(tab.id)}
              onCheckedChange={() => handleToggle(tab.id)}
            />
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Folder className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-sm truncate">{tab.name}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Selecciona las pestañas donde quieres que aparezca este contenido
      </p>
    </div>
  )
}
