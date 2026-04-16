"use client";

import * as React from "react";
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear, isWithinInterval, isSameDay } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange) => void;
  className?: string;
  presets?: boolean;
}

const PRESET_RANGES = [
  { label: "Last 7 days", value: "7d", getDates: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: "Last 30 days", value: "30d", getDates: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: "Last 90 days", value: "90d", getDates: () => ({ from: subDays(new Date(), 90), to: new Date() }) },
  { label: "This month", value: "month", getDates: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: "Last month", value: "lastMonth", getDates: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: "This year", value: "year", getDates: () => ({ from: startOfYear(new Date()), to: new Date() }) },
  { label: "Last 12 months", value: "1y", getDates: () => ({ from: subDays(new Date(), 365), to: new Date() }) },
];

export function DateRangePicker({ value, onChange, className, presets = true }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [hoverDate, setHoverDate] = React.useState<Date | null>(null);
  const [selecting, setSelecting] = React.useState<"from" | "to">("from");
  const [tempRange, setTempRange] = React.useState<Partial<DateRange>>({});
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days: (Date | null)[] = [];
    
    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const handleDateClick = (date: Date) => {
    if (selecting === "from") {
      setTempRange({ from: date });
      setSelecting("to");
    } else {
      const from = tempRange.from!;
      const to = date;
      const range = from <= to ? { from, to } : { from: to, to: from };
      setTempRange({});
      setSelecting("from");
      onChange?.(range);
      setIsOpen(false);
    }
  };

  const handlePresetClick = (preset: typeof PRESET_RANGES[0]) => {
    const range = preset.getDates();
    onChange?.(range);
    setIsOpen(false);
  };

  const isInRange = (date: Date) => {
    if (!value?.from || !value?.to) return false;
    return isWithinInterval(date, { start: value.from, end: value.to });
  };

  const isHoverInRange = (date: Date) => {
    if (!tempRange.from || !hoverDate) return false;
    const start = tempRange.from <= hoverDate ? tempRange.from : hoverDate;
    const end = tempRange.from <= hoverDate ? hoverDate : tempRange.from;
    return isWithinInterval(date, { start, end });
  };

  const isSelected = (date: Date) => {
    if (value?.from && isSameDay(date, value.from)) return true;
    if (value?.to && isSameDay(date, value.to)) return true;
    if (tempRange.from && isSameDay(date, tempRange.from)) return true;
    return false;
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Button
        variant="outline"
        className={cn(
          "justify-start text-left font-normal border-zinc-700 hover:bg-zinc-800",
          !value && "text-zinc-400"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {value?.from ? (
          value.to ? (
            <>
              {format(value.from, "MMM d, yyyy")} - {format(value.to, "MMM d, yyyy")}
            </>
          ) : (
            format(value.from, "MMM d, yyyy")
          )
        ) : (
          <span>Pick a date range</span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden animate-fade-in-up">
          <div className="flex">
            {/* Presets */}
            {presets && (
              <div className="w-40 border-r border-zinc-700 p-2">
                <p className="text-xs text-zinc-500 uppercase tracking-wider px-2 py-1 mb-1">Quick select</p>
                {PRESET_RANGES.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handlePresetClick(preset)}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}

            {/* Calendar */}
            <div className="p-4">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="font-medium text-white">
                  {format(currentMonth, "MMMM yyyy")}
                </span>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                  className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              {/* Day names */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                  <div key={day} className="w-9 h-9 flex items-center justify-center text-xs text-zinc-500">
                    {day}
                  </div>
                ))}
              </div>

              {/* Days */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${index}`} className="w-9 h-9" />;
                  }
                  
                  const isToday = isSameDay(date, new Date());
                  const inRange = isInRange(date);
                  const inHoverRange = isHoverInRange(date);
                  const selected = isSelected(date);
                  const isFuture = date > new Date();
                  
                  return (
                    <button
                      key={date.toISOString()}
                      disabled={isFuture}
                      onClick={() => handleDateClick(date)}
                      onMouseEnter={() => setHoverDate(date)}
                      onMouseLeave={() => setHoverDate(null)}
                      className={cn(
                        "w-9 h-9 flex items-center justify-center text-sm rounded-lg transition-all",
                        isFuture && "text-zinc-600 cursor-not-allowed",
                        !isFuture && !selected && !inRange && "text-zinc-300 hover:bg-zinc-800",
                        isToday && !selected && "ring-1 ring-emerald-500",
                        (inRange || inHoverRange) && !selected && "bg-emerald-500/20 text-emerald-300",
                        selected && "bg-emerald-500 text-white"
                      )}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              {/* Selection hint */}
              {selecting === "to" && tempRange.from && (
                <p className="text-xs text-zinc-500 mt-3 text-center">
                  Select end date
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
