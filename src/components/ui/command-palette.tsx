"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  Search,
  FileText,
  Link2,
  CreditCard,
  Users,
  Settings,
  HelpCircle,
  Home,
  BarChart3,
  Receipt,
  LogOut,
  Plus,
  X,
  ArrowRight,
  Keyboard,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  action?: () => void;
  href?: string;
  shortcut?: string[];
  category: "navigation" | "actions" | "settings";
}

interface CommandPaletteProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CommandPalette({ isOpen: controlledOpen, onOpenChange }: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const router = useRouter();

  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = onOpenChange ?? setInternalOpen;

  const commands: CommandItem[] = [
    // Navigation
    { id: "dashboard", label: "Go to Dashboard", icon: Home, href: "/dashboard", category: "navigation", shortcut: ["G", "D"] },
    { id: "invoices", label: "Go to Invoices", icon: FileText, href: "/dashboard/invoices", category: "navigation", shortcut: ["G", "I"] },
    { id: "payment-links", label: "Go to Payment Links", icon: Link2, href: "/dashboard/payment-links", category: "navigation", shortcut: ["G", "P"] },
    { id: "transactions", label: "Go to Transactions", icon: CreditCard, href: "/dashboard/transactions", category: "navigation", shortcut: ["G", "T"] },
    { id: "analytics", label: "Go to Analytics", icon: BarChart3, href: "/dashboard/analytics", category: "navigation", shortcut: ["G", "A"] },
    { id: "receipts", label: "Go to Receipts", icon: Receipt, href: "/dashboard/receipts", category: "navigation", shortcut: ["G", "R"] },
    { id: "team", label: "Go to Team", icon: Users, href: "/dashboard/team", category: "navigation" },
    
    // Actions
    { id: "new-invoice", label: "Create New Invoice", description: "Generate a new invoice for a client", icon: Plus, href: "/dashboard/invoices?new=true", category: "actions", shortcut: ["C", "I"] },
    { id: "new-payment-link", label: "Create Payment Link", description: "Generate a new payment link", icon: Plus, href: "/dashboard/payment-links?new=true", category: "actions", shortcut: ["C", "P"] },
    
    // Settings
    { id: "settings", label: "Settings", description: "Manage your account settings", icon: Settings, href: "/dashboard/settings", category: "settings" },
    { id: "help", label: "Help & Support", description: "Get help with Sera", icon: HelpCircle, href: "/dashboard/help", category: "settings" },
  ];

  const filteredCommands = commands.filter((command) => {
    const searchLower = search.toLowerCase();
    return (
      command.label.toLowerCase().includes(searchLower) ||
      command.description?.toLowerCase().includes(searchLower) ||
      command.id.toLowerCase().includes(searchLower)
    );
  });

  const groupedCommands = React.useMemo(() => {
    const groups: Record<string, CommandItem[]> = {
      navigation: [],
      actions: [],
      settings: [],
    };
    
    filteredCommands.forEach((command) => {
      groups[command.category].push(command);
    });
    
    return groups;
  }, [filteredCommands]);

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(!isOpen);
        return;
      }

      if (!isOpen) return;

      // Close with Escape
      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
        return;
      }

      // Navigate with arrows
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      // Execute with Enter
      if (e.key === "Enter") {
        e.preventDefault();
        const selected = filteredCommands[selectedIndex];
        if (selected) {
          executeCommand(selected);
        }
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, setIsOpen]);

  // Focus input when opening
  React.useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSearch("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Reset selection when search changes
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const executeCommand = (command: CommandItem) => {
    setIsOpen(false);
    if (command.action) {
      command.action();
    } else if (command.href) {
      router.push(command.href);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in"
        onClick={() => setIsOpen(false)}
      />

      {/* Command Palette */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4">
        <div
          className="w-full max-w-xl bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
            <Search className="h-5 w-5 text-zinc-400" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type a command or search..."
              className="flex-1 bg-transparent text-white placeholder-zinc-500 outline-none text-lg"
            />
            <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 text-zinc-400 text-xs">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto p-2">
            {filteredCommands.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-zinc-400">No results found</p>
                <p className="text-zinc-500 text-sm mt-1">Try a different search term</p>
              </div>
            ) : (
              <>
                {/* Navigation */}
                {groupedCommands.navigation.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider px-3 py-2">Navigation</p>
                    {groupedCommands.navigation.map((command, index) => {
                      const absoluteIndex = filteredCommands.indexOf(command);
                      return (
                        <CommandRow
                          key={command.id}
                          command={command}
                          isSelected={absoluteIndex === selectedIndex}
                          onSelect={() => executeCommand(command)}
                          onHover={() => setSelectedIndex(absoluteIndex)}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Actions */}
                {groupedCommands.actions.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider px-3 py-2">Quick Actions</p>
                    {groupedCommands.actions.map((command) => {
                      const absoluteIndex = filteredCommands.indexOf(command);
                      return (
                        <CommandRow
                          key={command.id}
                          command={command}
                          isSelected={absoluteIndex === selectedIndex}
                          onSelect={() => executeCommand(command)}
                          onHover={() => setSelectedIndex(absoluteIndex)}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Settings */}
                {groupedCommands.settings.length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider px-3 py-2">Settings</p>
                    {groupedCommands.settings.map((command) => {
                      const absoluteIndex = filteredCommands.indexOf(command);
                      return (
                        <CommandRow
                          key={command.id}
                          command={command}
                          isSelected={absoluteIndex === selectedIndex}
                          onSelect={() => executeCommand(command)}
                          onHover={() => setSelectedIndex(absoluteIndex)}
                        />
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 text-xs text-zinc-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">↑↓</kbd>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">↵</kbd>
                <span>Select</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">esc</kbd>
                <span>Close</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Keyboard className="h-3.5 w-3.5" />
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">⌘</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">K</kbd>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

interface CommandRowProps {
  command: CommandItem;
  isSelected: boolean;
  onSelect: () => void;
  onHover: () => void;
}

function CommandRow({ command, isSelected, onSelect, onHover }: CommandRowProps) {
  const Icon = command.icon;

  return (
    <button
      onClick={onSelect}
      onMouseEnter={onHover}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left",
        isSelected ? "bg-zinc-800 text-white" : "text-zinc-300 hover:bg-zinc-800/50"
      )}
    >
      <div
        className={cn(
          "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
          isSelected ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-400"
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{command.label}</p>
        {command.description && (
          <p className="text-sm text-zinc-500 truncate">{command.description}</p>
        )}
      </div>
      {command.shortcut && (
        <div className="hidden sm:flex items-center gap-1">
          {command.shortcut.map((key, index) => (
            <kbd
              key={index}
              className="px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400 text-xs"
            >
              {key}
            </kbd>
          ))}
        </div>
      )}
      {isSelected && (
        <ArrowRight className="h-4 w-4 text-zinc-500 shrink-0" />
      )}
    </button>
  );
}

// Hook to use command palette anywhere
export function useCommandPalette() {
  const [isOpen, setIsOpen] = React.useState(false);

  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);
  const toggle = React.useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle,
    CommandPaletteComponent: () => (
      <CommandPalette isOpen={isOpen} onOpenChange={setIsOpen} />
    ),
  };
}
