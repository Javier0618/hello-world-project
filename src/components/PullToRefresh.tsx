import { type ReactNode, type RefObject } from "react";
import { RefreshCw, Check } from "lucide-react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh?: () => Promise<void>;
  disabled?: boolean;
  scrollContainerRef?: RefObject<HTMLElement>;
}

const INDICATOR_SIZE = 40;

export const PullToRefresh = ({ 
  children, 
  onRefresh, 
  disabled = false,
  scrollContainerRef
}: PullToRefreshProps) => {
  const {
    containerRef,
    state,
    pullDistance,
    PULL_THRESHOLD,
    MAX_PULL_DISTANCE,
  } = usePullToRefresh({ onRefresh, disabled, scrollContainerRef });

  const getRotation = (): number => {
    if (state === "refreshing") return 0;
    if (state === "ready") return 180;
    return (pullDistance / PULL_THRESHOLD) * 180;
  };

  const getOpacity = (): number => {
    if (state === "complete") return 1;
    if (state === "refreshing") return 1;
    return Math.min(pullDistance / (PULL_THRESHOLD * 0.5), 1);
  };

  const getIndicatorTranslate = (): number => {
    if (state === "refreshing" || state === "complete") {
      return INDICATOR_SIZE + 12;
    }
    return Math.min(pullDistance, MAX_PULL_DISTANCE);
  };

  const showIndicator = state !== "idle" || pullDistance > 0;

  return (
    <div ref={containerRef} className="ptr-container" style={{ minHeight: "100%" }}>
      <div 
        className="ptr-indicator"
        style={{
          position: "fixed",
          top: "112px",
          left: "50%",
          transform: `translateX(-50%) translateY(${showIndicator ? getIndicatorTranslate() - INDICATOR_SIZE : -INDICATOR_SIZE - 20}px)`,
          width: `${INDICATOR_SIZE}px`,
          height: `${INDICATOR_SIZE}px`,
          borderRadius: "50%",
          backgroundColor: "hsl(var(--background))",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 45,
          opacity: getOpacity(),
          transition: state === "idle" && pullDistance === 0 
            ? "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease" 
            : "none",
          pointerEvents: "none",
        }}
      >
        {state === "complete" ? (
          <Check 
            className="ptr-check"
            style={{
              width: "22px",
              height: "22px",
              color: "hsl(var(--primary))",
              animation: "ptr-check-bounce 0.4s ease-out",
            }}
          />
        ) : (
          <RefreshCw 
            className={state === "refreshing" ? "ptr-spinner" : ""}
            style={{
              width: "22px",
              height: "22px",
              color: state === "ready" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
              transform: state === "refreshing" ? "none" : `rotate(${getRotation()}deg)`,
              transition: state === "pulling" ? "none" : "transform 0.15s ease-out, color 0.2s ease",
            }}
          />
        )}
      </div>
      {children}
    </div>
  );
};

export default PullToRefresh;
