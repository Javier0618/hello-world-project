"use client"

import { useEffect, useState, useRef } from "react"
import { ArrowLeft, PlayCircle } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"

// Imports de Capacitor
import { ScreenOrientation } from '@capacitor/screen-orientation'
import { StatusBar } from '@capacitor/status-bar'
import { Motion } from '@capacitor/motion'

interface VideoPlayerProps {
  videoUrl?: string | null
  loadingText?: string
  emptyText?: string
  className?: string
  showBackButton?: boolean
  backButtonClassName?: string
  onBack?: () => void
}

export function VideoPlayer({
  videoUrl,
  loadingText = "Cargando...",
  emptyText = "Video no disponible",
  className,
  showBackButton = true,
  backButtonClassName,
  onBack,
}: VideoPlayerProps) {
  const navigate = useNavigate()
  
  // Estado para el CSS de pantalla completa
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  // NUEVO: Estado para la "Cortina Negra" durante la transición
  const [isTransitioning, setIsTransitioning] = useState(false)
  
  const currentOrientation = useRef<"portrait" | "landscape-primary" | "landscape-secondary">("portrait")
  const stabilityCounter = useRef(0)
  const lastIntent = useRef<string | null>(null)

  const handleBackClick = () => {
    if (onBack) {
      onBack()
    } else {
      navigate("/")
    }
  }

  // Función auxiliar para ejecutar la rotación "a ciegas"
  const performRotation = async (targetMode: string) => {
    // 1. Bajamos el telón (Pantalla negra)
    setIsTransitioning(true);

    // Damos 100ms para que React pinte el negro antes de rotar
    setTimeout(async () => {
      
      if (targetMode === "portrait") {
        // APLICAR CAMBIOS LOGICOS
        setIsFullscreen(false);
        await ScreenOrientation.lock({ orientation: 'portrait' });
        await StatusBar.show();
        await StatusBar.setOverlaysWebView({ overlay: false });
      } else {
        // APLICAR CAMBIOS LOGICOS
        setIsFullscreen(true);
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.hide();
        await ScreenOrientation.lock({ 
          orientation: targetMode as 'landscape-primary' | 'landscape-secondary' 
        });
      }

      // 2. Esperamos a que la animación nativa de Android termine (aprox 500-600ms)
      // Mientras tanto, el usuario solo ve negro, no ve el deforme.
      setTimeout(() => {
        // 3. Subimos el telón (Revelar video ya acomodado)
        setIsTransitioning(false);
      }, 700); // 700ms es un tiempo seguro para la mayoría de Androids

    }, 50);
  };

  useEffect(() => {
    if (!videoUrl) return;

    let motionListener: any;

    const startMotionDetection = async () => {
      try {
        motionListener = await Motion.addListener('accel', async (event) => {
          const { x, y } = event.accelerationIncludingGravity;

          let detectedOrientation = "none";

          // UMBRALES DE DETECCIÓN (Calibrados)
          if (y > 7 && Math.abs(x) < 5) {
            detectedOrientation = "portrait";
          } else if (x > 8.5 && Math.abs(y) < 5) {
            detectedOrientation = "landscape-primary"; 
          } else if (x < -8.5 && Math.abs(y) < 5) {
            detectedOrientation = "landscape-secondary";
          }

          if (detectedOrientation !== "none" && detectedOrientation !== currentOrientation.current) {
            
            if (lastIntent.current === detectedOrientation) {
              stabilityCounter.current += 1;
            } else {
              lastIntent.current = detectedOrientation;
              stabilityCounter.current = 0;
            }

            // Umbral de estabilidad (10 lecturas ~ 200ms)
            if (stabilityCounter.current > 10) {
              // Confirmamos el cambio
              currentOrientation.current = detectedOrientation as any;
              stabilityCounter.current = 0;

              // EJECUTAMOS LA TRANSICIÓN SUAVE
              performRotation(detectedOrientation);
            }
          }
        });
      } catch (e) {
        console.error("Error sensor:", e);
      }
    };

    startMotionDetection();

    return () => {
      if (motionListener) motionListener.remove();
      ScreenOrientation.lock({ orientation: 'portrait' }).catch(() => {});
      StatusBar.show().catch(() => {});
      StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    };
  }, [videoUrl]);

  return (
    <div 
      className={cn(
        "bg-black flex items-center justify-center overflow-hidden", 
        isFullscreen 
          ? "fixed inset-0 z-[100] w-screen h-screen" 
          : "relative w-full h-full",
        className
      )}
    >
      {/* --- LA CORTINA MÁGICA --- */}
      {/* Este div negro cubre todo mientras se rota para ocultar el glitch visual */}
      <div 
        className={cn(
          "absolute inset-0 bg-black z-[200] transition-opacity duration-300 pointer-events-none",
          isTransitioning ? "opacity-100" : "opacity-0"
        )}
      />

      {showBackButton && (
        <button
          onClick={handleBackClick}
          className={cn(
            "absolute top-4 left-4 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors safe-area-top",
            backButtonClassName,
            // Ocultamos el botón durante la transición para que no baile
            isTransitioning ? "opacity-0" : "opacity-100"
          )}
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
      )}
      
      {videoUrl ? (
        <iframe 
          src={videoUrl} 
          className={cn(
            "border-none w-full h-full",
            // Un pequeño truco: durante la transición, hacemos el video un poco transparente 
            // para ayudar al efecto fade-in/fade-out
            isTransitioning ? "opacity-0" : "opacity-100 transition-opacity duration-500"
          )}
          allowFullScreen 
          allow="autoplay; encrypted-media" 
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
          <PlayCircle className="w-12 h-12 opacity-50" />
          <span className="text-sm">{videoUrl === null ? emptyText : loadingText}</span>
        </div>
      )}
    </div>
  )
}