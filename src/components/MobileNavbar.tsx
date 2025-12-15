"use client"

import { Link, useNavigate } from "react-router-dom"
import { Search, User, LogOut, Shield, UserCircle, ArrowLeft, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { useAdmin } from "@/hooks/useAdmin"
import { supabase } from "@/integrations/supabase/client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

interface MobileNavbarProps {
  showBackButton?: boolean
  title?: string
  onBack?: () => void
}

export const MobileNavbar = ({ showBackButton = false, title, onBack }: MobileNavbarProps) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isAdmin } = useAdmin()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/")
  }

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate(-1)
    }
  }

  return (
    <nav
      className={`${showBackButton ? "" : "md:hidden"} sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border`}
    >
      <div className="flex items-center justify-between h-16 px-4">
        {showBackButton ? (
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        ) : (
            <Link to="/" className="flex items-center">
            <img
              src="https://i.ibb.co/S7tPHwFz/Logo-SFusion2.png"  // <-- cambia esto por la ruta real de tu logo
              alt="SFusion"
              className="h-10 w-auto object-contain"
            />
            </Link>
        )}

        {title && <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-foreground">{title}</h1>}

        {!showBackButton && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/search")}>
              <Search className="w-5 h-5" />
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
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
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/auth")}>
                <User className="w-5 h-5" />
              </Button>
            )}
          </div>
        )}

        {showBackButton && <div className="w-9" />}
      </div>
    </nav>
  )
}
