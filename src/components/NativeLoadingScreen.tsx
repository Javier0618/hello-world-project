interface NativeLoadingScreenProps {
  progress: number
  currentTask: string
}

export const NativeLoadingScreen = ({ progress, currentTask }: NativeLoadingScreenProps) => {
  return (
    // CAMBIOS CLAVE:
    // 1. h-[100dvh]: Asegura que ocupe el alto real del viewport móvil (evita problemas con la barra de navegación del navegador).
    // 2. justify-between: Distribuye el contenido (Logo arriba/centro, Barra abajo).
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black md:hidden h-[100dvh] w-screen">
      
      {/* SECCIÓN SUPERIOR/CENTRAL (El Logo) */}
      {/* 'flex-1' hace que este div crezca para ocupar todo el espacio vacío, empujando la barra hacia abajo */}
      <div className="flex-1 flex items-center justify-center w-full">
        <img 
          src="https://i.ibb.co/tMTTfz8g/SFusion-Logo.png" 
          alt="Fusion" 
          className="h-24 w-auto object-contain" // Aumenté un poco el tamaño para que se vea bien
        />
      </div>
      
      {/* SECCIÓN INFERIOR (Barra y Texto) */}
      {/* pb-12: Padding bottom para separarlo del borde inferior del teléfono */}
      <div className="w-full flex flex-col items-center gap-3 px-8 pb-12 max-w-xs mx-auto">
        
        {/* Barra de progreso */}
        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{ 
              width: `${progress}%`,
              backgroundColor: '#f97316'
            }}
          />
        </div>
        
        {/* Texto */}
        <p className="text-sm text-zinc-400 font-medium">
          Cargando... {Math.round(progress)}%
        </p>
      </div>
    </div>
  )
}