import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { clearMemoryCache } from "@/components/CachedImage";

const CACHE_NAME = "streamfusion-images-v2";

const clearImageCache = async () => {
  try {
    clearMemoryCache();
    
    if ("caches" in window) {
      await caches.delete(CACHE_NAME);
    }

    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        const handler = (event: MessageEvent) => {
          if (event.data && event.data.type === "CACHE_CLEARED") {
            navigator.serviceWorker.removeEventListener("message", handler);
            resolve();
          }
        };
        navigator.serviceWorker.addEventListener("message", handler);
        navigator.serviceWorker.controller!.postMessage({
          type: "CLEAR_CACHE",
        });
        
        setTimeout(() => {
          navigator.serviceWorker.removeEventListener("message", handler);
          resolve();
        }, 2000);
      });
    }
  } catch (error) {
    console.warn("Failed to clear image cache:", error);
  }
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const previousUserRef = useRef<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      previousUserRef.current = session?.user ?? null;
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const newUser = session?.user ?? null;
      
      if (event === "SIGNED_OUT" && previousUserRef.current) {
        clearImageCache();
      }
      
      setUser(newUser);
      previousUserRef.current = newUser;
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await clearImageCache();
    await supabase.auth.signOut();
  }, []);

  return { user, loading, signOut };
};
