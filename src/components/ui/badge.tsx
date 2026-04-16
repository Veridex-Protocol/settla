"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
        secondary:
          "bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700",
        success:
          "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
        warning:
          "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
        destructive:
          "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        info:
          "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        violet:
          "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
        outline:
          "border border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            "mr-1.5 h-1.5 w-1.5 rounded-full",
            variant === "success" && "bg-emerald-500",
            variant === "warning" && "bg-amber-500",
            variant === "destructive" && "bg-red-500",
            variant === "info" && "bg-blue-500",
            variant === "violet" && "bg-violet-500",
            (!variant || variant === "default" || variant === "secondary" || variant === "outline") &&
            "bg-slate-500"
          )}
        />
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };

// Status badge with predefined statuses for convenience
type Status = 'draft' | 'pending' | 'sent' | 'paid' | 'settled' | 'cancelled' | 'expired' | 'failed' | 'open' | 'partial' | 'filled' | 'claimed' | 'active';

const statusVariants: Record<Status, BadgeProps['variant']> = {
  draft: 'default',
  pending: 'warning',
  sent: 'info',
  paid: 'success',
  settled: 'success',
  cancelled: 'destructive',
  expired: 'destructive',
  failed: 'destructive',
  open: 'info',
  partial: 'warning',
  filled: 'success',
  claimed: 'success',
  active: 'success',
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge variant={statusVariants[status]} dot>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
