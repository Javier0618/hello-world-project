"use client"

import { useEffect } from "react"
import { StatusBar, Style } from "@capacitor/status-bar"
import { ScreenOrientation } from "@capacitor/screen-orientation"
import { App as CapacitorApp } from "@capacitor/app"
import { SplashScreen } from "@capacitor/splash-screen"
import { PushNotifications } from "@capacitor/push-notifications"

import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom"

import { useContentProtection } from "./hooks/useContentProtection"
import { ImageCacheProvider } from "./contexts/ImageCacheContext"
import { HomeVisitProvider } from "./contexts/HomeVisitContext"
import { TabNavigationProvider } from "./contexts/TabNavigationContext"
import Home from "./pages/Home"
import Movies from "./pages/Movies"
import TVShows from "./pages/TVShows"
import MovieDetail from "./pages/MovieDetail"
import TVShowDetail from "./pages/TVShowDetail"
import Search from "./pages/Search"
import Auth from "./pages/Auth"
import Admin from "./pages/Admin"
import Profile from "./pages/Profile"
import ProfileSaved from "./pages/ProfileSaved"
import History from "./pages/History"
import ViewAll from "./pages/ViewAll"
import NotFound from "./pages/NotFound"
import PlatformContent from "./pages/PlatformContent"
import ScrollToTop from "./components/ScrollToTop"
import { NativeLoadingScreen } from "./components/NativeLoadingScreen"
import { useAppInitializer } from "./hooks/useAppInitializer"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Number.POSITIVE_INFINITY,
      gcTime: Number.POSITIVE_INFINITY,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  },
})

const AndroidBackButton = () => {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    let backButtonListener: any
    const setupBackButton = async () => {
      backButtonListener = await CapacitorApp.addListener("backButton", ({ canGoBack }) => {
        if (location.pathname === "/" || location.pathname === "/auth") {
          CapacitorApp.exitApp()
        } else {
          navigate(-1)
        }
      })
    }
    setupBackButton()
    return () => {
      if (backButtonListener) backButtonListener.remove()
    }
  }, [navigate, location])
  return null
}

const AppContent = () => {
  const { isInitialized, isLoading, progress, currentTask } = useAppInitializer()
  useContentProtection()

  useEffect(() => {
    const initAppConfig = async () => {
      try {
        await ScreenOrientation.lock({ orientation: "portrait" })
        await StatusBar.show()
        await StatusBar.setStyle({ style: Style.Dark })
        await StatusBar.setBackgroundColor({ color: "#000000" })
        await StatusBar.setOverlaysWebView({ overlay: false })
        
        setTimeout(async () => {
          await SplashScreen.hide()
        }, 2000)

        let permStatus = await PushNotifications.checkPermissions()

        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions()
        }

        if (permStatus.receive === 'granted') {
          try {
            await PushNotifications.register()
          } catch (e) {
            console.error("Error registrando push (posiblemente falta google-services.json)", e)
          }
        }

      } catch (error) {
        console.log("Error en inicialización nativa:", error)
      }
    }
    initAppConfig()
  }, [])

  if (isLoading && !isInitialized) {
    return <NativeLoadingScreen progress={progress} currentTask={currentTask} />
  }

  return (
    <>
      <ScrollToTop />
      <AndroidBackButton />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/tv" element={<TVShows />} />
        <Route path="/movie/:id" element={<MovieDetail />} />
        <Route path="/tv/:id" element={<TVShowDetail />} />
        <Route path="/search" element={<Search />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/saved" element={<ProfileSaved />} />
        <Route path="/historial" element={<History />} />
        <Route path="/view-all/:type/:category?" element={<ViewAll />} />
        <Route path="/platform/:id" element={<PlatformContent />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ImageCacheProvider>
        <HomeVisitProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <TabNavigationProvider>
                <AppContent />
              </TabNavigationProvider>
            </BrowserRouter>
          </TooltipProvider>
        </HomeVisitProvider>
      </ImageCacheProvider>
    </QueryClientProvider>
  )
}

export default App
