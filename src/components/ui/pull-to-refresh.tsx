"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  /** Pull distance needed to trigger refresh (default: 80) */
  threshold?: number;
  /** Maximum pull distance (default: 120) */
  maxPull?: number;
  /** Whether pull to refresh is enabled (default: true) */
  enabled?: boolean;
  className?: string;
}

type PullState = "idle" | "pulling" | "ready" | "refreshing";

export function PullToRefresh({
  onRefresh,
  children,
  threshold = 80,
  maxPull = 120,
  enabled = true,
  className,
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [state, setState] = useState<PullState>("idle");
  const startY = useRef(0);
  const currentY = useRef(0);
  const isAtTop = useRef(true);

  // Check if we're at the top of the scroll container
  const checkScrollTop = useCallback(() => {
    if (containerRef.current) {
      isAtTop.current = containerRef.current.scrollTop <= 0;
    }
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || state === "refreshing") return;
      checkScrollTop();
      if (!isAtTop.current) return;

      startY.current = e.touches[0].clientY;
      currentY.current = e.touches[0].clientY;
    },
    [enabled, state, checkScrollTop]
  );

  // Handle touch move
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || state === "refreshing") return;
      if (!isAtTop.current && pullDistance === 0) return;

      currentY.current = e.touches[0].clientY;
      const diff = currentY.current - startY.current;

      // Only allow pulling down
      if (diff > 0) {
        // Apply resistance as we pull further
        const resistance = Math.min(diff / 2, maxPull);
        setPullDistance(resistance);

        if (resistance >= threshold) {
          setState("ready");
        } else {
          setState("pulling");
        }

        // Prevent default scrolling while pulling
        e.preventDefault();
      }
    },
    [enabled, state, threshold, maxPull, pullDistance]
  );

  // Handle touch end
  const handleTouchEnd = useCallback(async () => {
    if (!enabled) return;

    if (state === "ready") {
      setState("refreshing");
      setPullDistance(60); // Hold at a visible position during refresh

      try {
        await onRefresh();
      } catch (error) {
        console.error("Refresh failed:", error);
      }

      // Small delay before resetting for visual feedback
      setTimeout(() => {
        setState("idle");
        setPullDistance(0);
      }, 300);
    } else {
      setState("idle");
      setPullDistance(0);
    }
  }, [enabled, state, onRefresh]);

  // Reset on scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      checkScrollTop();
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [checkScrollTop]);

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 360;

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        // Prevent iOS bounce on overscroll
        overscrollBehavior: "contain",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {/* Pull indicator */}
      {enabled && pullDistance > 0 && (
        <div
          className="absolute left-0 right-0 flex items-center justify-center pointer-events-none z-10"
          style={{
            top: 0,
            height: pullDistance,
            transition: state === "idle" ? "height 0.2s ease-out" : "none",
          }}
        >
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              "bg-zinc-800/80 backdrop-blur-sm border border-zinc-700",
              state === "refreshing" && "animate-pulse"
            )}
          >
            <RefreshCw
              className={cn(
                "w-5 h-5",
                state === "ready" || state === "refreshing"
                  ? "text-emerald-400"
                  : "text-zinc-400",
                state === "refreshing" && "animate-spin"
              )}
              style={{
                transform:
                  state !== "refreshing" ? `rotate(${rotation}deg)` : undefined,
                transition: "color 0.2s",
              }}
            />
          </div>
        </div>
      )}

      {/* Content with pull offset */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: state === "idle" ? "transform 0.2s ease-out" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Hook for using pull-to-refresh state
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  return {
    isRefreshing,
    handleRefresh,
  };
}
