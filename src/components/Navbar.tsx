"use client"

import type React from "react"

import { useLocation, useNavigate } from "react-router-dom"
import { Search, Film, Tv, User, LogOut, Shield, UserCircle, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import { useAdmin } from "@/hooks/useAdmin"
import { supabase } from "@/integrations/supabase/client"
import { getTabSections } from "@/lib/sectionQueries"
import { shouldShowForScreen } from "@/hooks/useScreenSize"
import { useTabNavigation } from "@/contexts/TabNavigationContext"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

export const Navbar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")
  const { user } = useAuth()
  const { isAdmin } = useAdmin()
  const { activeTab, handleTabChange } = useTabNavigation()

  const { data: tabSections } = useQuery({
    queryKey: ["tab-sections"],
    queryFn: getTabSections,
    staleTime: Infinity,
  })

  const desktopTabSections = tabSections?.filter((section) =>
    shouldShowForScreen(section.screen_visibility as "all" | "mobile" | "desktop", "desktop")
  ) || []

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/")
  }

  const handleNavTabChange = (tabId: string) => {
    if (location.pathname !== "/") {
      navigate("/")
    }
    handleTabChange(tabId)
  }

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <button onClick={() => handleNavTabChange("inicio")} className="flex items-center">
              <img
                src="https://i.ibb.co/S7tPHwFz/Logo-SFusion2.png"
                alt="SFusion"
                className="h-10 w-auto object-contain"
              />
            </button>
            <div className="hidden md:flex gap-6">
              <Button
                variant="ghost"
                className={
                  location.pathname === "/" && activeTab === "inicio"
                    ? "text-primary"
                    : "text-muted-foreground"
                }
                onClick={() => handleNavTabChange("inicio")}
              >
                Inicio
              </Button>
              <Button
                variant="ghost"
                className={
                  location.pathname === "/" && activeTab === "peliculas"
                    ? "text-primary"
                    : "text-muted-foreground"
                }
                onClick={() => handleNavTabChange("peliculas")}
              >
                <Film className="w-4 h-4 mr-2" />
                Películas
              </Button>
              <Button
                variant="ghost"
                className={
                  location.pathname === "/" && activeTab === "series"
                    ? "text-primary"
                    : "text-muted-foreground"
                }
                onClick={() => handleNavTabChange("series")}
              >
                <Tv className="w-4 h-4 mr-2" />
                Series
              </Button>
              {desktopTabSections.map((section) => (
                <Button
                  key={section.id}
                  variant="ghost"
                  className={
                    location.pathname === "/" && activeTab === section.id
                      ? "text-primary"
                      : "text-muted-foreground"
                  }
                  onClick={() => handleNavTabChange(section.id)}
                >
                  {section.name}
                </Button>
              ))}
            </div>
          </div>
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar..."
                className="pl-10 w-48 md:w-64 bg-secondary border-0"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>
          <div className="flex items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
                    <UserCircle className="w-4 h-4 mr-2" />
                    Mi Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/historial")} className="cursor-pointer">
                    <History className="w-4 h-4 mr-2" />
                    Historial
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate("/admin")} className="cursor-pointer">
                        <Shield className="w-4 h-4 mr-2" />
                        Panel Admin
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" size="icon" onClick={() => navigate("/auth")}>
                <User className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
