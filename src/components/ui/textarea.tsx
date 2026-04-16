"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, error, ...props }, ref) => {
        return (
            <div className="relative w-full">
                <textarea
                    className={cn(
                        "flex min-h-[100px] w-full rounded-xl border bg-white px-4 py-3 text-sm shadow-sm transition-all duration-200",
                        "border-slate-200 placeholder:text-slate-400 resize-none",
                        "focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20",
                        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50",
                        "dark:bg-slate-900 dark:border-slate-700 dark:placeholder:text-slate-500",
                        error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
                        className
                    )}
                    ref={ref}
                    {...props}
                />
                {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
            </div>
        );
    }
);
Textarea.displayName = "Textarea";

export { Textarea };
