"use client";

import React, { useRef, useState, useCallback, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Trash2, Edit, MoreHorizontal, Archive } from "lucide-react";

interface SwipeAction {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: "red" | "blue" | "green" | "amber" | "zinc";
  onClick: () => void;
}

interface SwipeableListItemProps {
  children: ReactNode;
  /** Actions shown when swiping left (from right side) */
  leftActions?: SwipeAction[];
  /** Actions shown when swiping right (from left side) */
  rightActions?: SwipeAction[];
  /** Threshold to trigger action (default: 80) */
  threshold?: number;
  /** Whether swipe is enabled (default: true) */
  enabled?: boolean;
  /** Called when item is clicked (not swiped) */
  onClick?: () => void;
  className?: string;
}

const colorClasses: Record<SwipeAction["color"], string> = {
  red: "bg-red-500 text-white",
  blue: "bg-blue-500 text-white",
  green: "bg-emerald-500 text-white",
  amber: "bg-amber-500 text-white",
  zinc: "bg-zinc-600 text-white",
};

export function SwipeableListItem({
  children,
  leftActions = [],
  rightActions = [],
  threshold = 80,
  enabled = true,
  onClick,
  className,
}: SwipeableListItemProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [swipeX, setSwipeX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  // Calculate max swipe distance based on actions
  const maxLeftSwipe = leftActions.length * 72; // 72px per action button
  const maxRightSwipe = rightActions.length * 72;

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      currentX.current = e.touches[0].clientX;
      isHorizontalSwipe.current = null;
      setIsDragging(true);
      setIsResetting(false);
    },
    [enabled]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || !isDragging) return;

      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      const diffX = touchX - startX.current;
      const diffY = touchY - startY.current;

      // Determine if this is a horizontal or vertical swipe
      if (isHorizontalSwipe.current === null) {
        if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
          isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY);
        }
      }

      // Only handle horizontal swipes
      if (isHorizontalSwipe.current === false) {
        return;
      }

      if (isHorizontalSwipe.current) {
        e.preventDefault();
        currentX.current = touchX;

        // Calculate bounded swipe distance
        let newSwipeX = diffX;

        // Apply resistance and bounds
        if (newSwipeX < 0) {
          // Swiping left (reveal left actions)
          newSwipeX = Math.max(newSwipeX, -maxLeftSwipe - 20);
          // Apply resistance past the threshold
          if (Math.abs(newSwipeX) > maxLeftSwipe) {
            const excess = Math.abs(newSwipeX) - maxLeftSwipe;
            newSwipeX = -(maxLeftSwipe + excess * 0.3);
          }
        } else {
          // Swiping right (reveal right actions)
          newSwipeX = Math.min(newSwipeX, maxRightSwipe + 20);
          if (newSwipeX > maxRightSwipe) {
            const excess = newSwipeX - maxRightSwipe;
            newSwipeX = maxRightSwipe + excess * 0.3;
          }
        }

        setSwipeX(newSwipeX);
      }
    },
    [enabled, isDragging, maxLeftSwipe, maxRightSwipe]
  );

  const handleTouchEnd = useCallback(() => {
    if (!enabled) return;
    setIsDragging(false);

    // Determine final position based on swipe distance
    if (Math.abs(swipeX) < threshold / 2) {
      // Not swiped far enough, reset
      setIsResetting(true);
      setSwipeX(0);
    } else if (swipeX < 0 && leftActions.length > 0) {
      // Swiped left, show left actions
      setIsResetting(true);
      setSwipeX(-maxLeftSwipe);
    } else if (swipeX > 0 && rightActions.length > 0) {
      // Swiped right, show right actions
      setIsResetting(true);
      setSwipeX(maxRightSwipe);
    } else {
      // No actions for this direction, reset
      setIsResetting(true);
      setSwipeX(0);
    }

    // Clear resetting state after animation
    setTimeout(() => setIsResetting(false), 200);
  }, [enabled, swipeX, threshold, leftActions.length, rightActions.length, maxLeftSwipe, maxRightSwipe]);

  const handleClick = useCallback(() => {
    if (!isDragging && Math.abs(swipeX) < 5 && onClick) {
      onClick();
    } else if (Math.abs(swipeX) > 0) {
      // Reset if actions are visible
      setIsResetting(true);
      setSwipeX(0);
      setTimeout(() => setIsResetting(false), 200);
    }
  }, [isDragging, swipeX, onClick]);

  const handleActionClick = useCallback((action: SwipeAction) => {
    action.onClick();
    // Reset after action
    setIsResetting(true);
    setSwipeX(0);
    setTimeout(() => setIsResetting(false), 200);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
    >
      {/* Right actions (revealed when swiping right) */}
      {rightActions.length > 0 && (
        <div className="absolute left-0 top-0 bottom-0 flex">
          {rightActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => handleActionClick(action)}
                className={cn(
                  "w-18 h-full flex flex-col items-center justify-center gap-1 px-4",
                  colorClasses[action.color]
                )}
                style={{ width: 72 }}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{action.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Left actions (revealed when swiping left) */}
      {leftActions.length > 0 && (
        <div className="absolute right-0 top-0 bottom-0 flex">
          {leftActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => handleActionClick(action)}
                className={cn(
                  "w-18 h-full flex flex-col items-center justify-center gap-1 px-4",
                  colorClasses[action.color]
                )}
                style={{ width: 72 }}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{action.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main content */}
      <div
        className={cn(
          "relative bg-zinc-900",
          isResetting && "transition-transform duration-200 ease-out"
        )}
        style={{
          transform: `translateX(${swipeX}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        {children}
      </div>
    </div>
  );
}

// Pre-configured common actions
export const deleteAction = (onClick: () => void): SwipeAction => ({
  id: "delete",
  icon: Trash2,
  label: "Delete",
  color: "red",
  onClick,
});

export const editAction = (onClick: () => void): SwipeAction => ({
  id: "edit",
  icon: Edit,
  label: "Edit",
  color: "blue",
  onClick,
});

export const archiveAction = (onClick: () => void): SwipeAction => ({
  id: "archive",
  icon: Archive,
  label: "Archive",
  color: "amber",
  onClick,
});

export const moreAction = (onClick: () => void): SwipeAction => ({
  id: "more",
  icon: MoreHorizontal,
  label: "More",
  color: "zinc",
  onClick,
});
