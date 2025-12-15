import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'stream.fusion',
  appName: 'StreamFusion',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      // Tiempo que dura la imagen antes de desaparecer (en milisegundos)
      launchShowDuration: 3000, 
      // Si debe ocultarse automáticamente
      launchAutoHide: true,
      // Duración del efecto de desvanecimiento al quitarse
      launchFadeOutDuration: 300,
      // Color de fondo (Negro para tu app de streaming)
      backgroundColor: "#000000", 
      // Nombre del archivo generado (por defecto es 'splash')
      androidSplashResourceName: "splash",
      // Cómo se estira la imagen (CENTER_CROP llena la pantalla sin deformar)
      androidScaleType: "CENTER_CROP",
      // Mostrar la ruedita de carga
      showSpinner: true,
      // Color de la ruedita de carga (Puedes poner el color de tu marca, ej: Rojo)
      spinnerColor: "#E50914", 
    }
  }
};

export default config;