"use client";

import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Step {
  id: number;
  title: string;
  description: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* Desktop horizontal layout */}
      <div className="hidden sm:block">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const isUpcoming = currentStep < step.id;

            return (
              <React.Fragment key={step.id}>
                {/* Step */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300",
                      isCompleted && "border-green-500 bg-green-500 text-white",
                      isCurrent && "border-indigo-500 bg-indigo-500 text-white shadow-lg shadow-indigo-500/30",
                      isUpcoming && "border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p
                      className={cn(
                        "text-sm font-medium transition-colors",
                        isCompleted && "text-green-600 dark:text-green-400",
                        isCurrent && "text-indigo-600 dark:text-indigo-400",
                        isUpcoming && "text-slate-400 dark:text-slate-500"
                      )}
                    >
                      {step.title}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-xs transition-colors",
                        isCurrent ? "text-slate-600 dark:text-slate-400" : "text-slate-400 dark:text-slate-500"
                      )}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Connector */}
                {index < steps.length - 1 && (
                  <div className="flex-1 px-4">
                    <div
                      className={cn(
                        "h-0.5 w-full transition-colors duration-300",
                        currentStep > step.id + 1
                          ? "bg-green-500"
                          : currentStep > step.id
                          ? "bg-gradient-to-r from-green-500 to-slate-300 dark:to-slate-600"
                          : "bg-slate-300 dark:bg-slate-600"
                      )}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Mobile vertical layout */}
      <div className="sm:hidden">
        <div className="flex items-center gap-4">
          {steps.map((step) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;

            return (
              <div
                key={step.id}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all",
                  isCompleted && "bg-green-500 text-white",
                  isCurrent && "bg-indigo-500 text-white ring-4 ring-indigo-500/20",
                  !isCompleted && !isCurrent && "bg-slate-200 text-slate-500 dark:bg-slate-700"
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : step.id}
              </div>
            );
          })}
        </div>
        <div className="mt-4">
          <p className="font-medium text-slate-900 dark:text-white">
            Step {currentStep}: {steps.find(s => s.id === currentStep)?.title}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {steps.find(s => s.id === currentStep)?.description}
          </p>
        </div>
      </div>
    </div>
  );
}
