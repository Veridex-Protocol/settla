"use client";

import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./dialog";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import {
    AlertTriangle,
    CheckCircle2,
    Info,
    XCircle,
    Loader2,
    Trash2,
    Send,
    FileText,
} from "lucide-react";

export type ConfirmDialogVariant = "danger" | "warning" | "success" | "info" | "default";

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmDialogVariant;
    icon?: React.ReactNode;
    isLoading?: boolean;
}

const variantStyles: Record<ConfirmDialogVariant, {
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    buttonVariant: "destructive" | "default";
}> = {
    danger: {
        icon: <Trash2 className="h-6 w-6" />,
        iconBg: "bg-red-100 dark:bg-red-950/50",
        iconColor: "text-red-600 dark:text-red-400",
        buttonVariant: "destructive",
    },
    warning: {
        icon: <AlertTriangle className="h-6 w-6" />,
        iconBg: "bg-amber-100 dark:bg-amber-950/50",
        iconColor: "text-amber-600 dark:text-amber-400",
        buttonVariant: "default",
    },
    success: {
        icon: <CheckCircle2 className="h-6 w-6" />,
        iconBg: "bg-emerald-100 dark:bg-emerald-950/50",
        iconColor: "text-emerald-600 dark:text-emerald-400",
        buttonVariant: "default",
    },
    info: {
        icon: <Info className="h-6 w-6" />,
        iconBg: "bg-blue-100 dark:bg-blue-950/50",
        iconColor: "text-blue-600 dark:text-blue-400",
        buttonVariant: "default",
    },
    default: {
        icon: <CheckCircle2 className="h-6 w-6" />,
        iconBg: "bg-slate-100 dark:bg-slate-800",
        iconColor: "text-slate-600 dark:text-slate-400",
        buttonVariant: "default",
    },
};

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = "danger",
    icon,
    isLoading = false,
}: ConfirmDialogProps) {
    const styles = variantStyles[variant];
    const [isPending, setIsPending] = React.useState(false);

    const handleConfirm = async () => {
        setIsPending(true);
        try {
            await onConfirm();
        } finally {
            setIsPending(false);
        }
    };

    const loading = isLoading || isPending;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
            <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 text-white">
                <DialogHeader className="gap-4">
                    <div className="flex items-start gap-4">
                        <div className={cn(
                            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
                            styles.iconBg,
                            styles.iconColor
                        )}>
                            {icon || styles.icon}
                        </div>
                        <div className="flex flex-col gap-1">
                            <DialogTitle className="text-lg font-semibold text-white">
                                {title}
                            </DialogTitle>
                            {description && (
                                <DialogDescription className="text-zinc-400">
                                    {description}
                                </DialogDescription>
                            )}
                        </div>
                    </div>
                </DialogHeader>
                <DialogFooter className="mt-4 gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={loading}
                        className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white"
                    >
                        {cancelText}
                    </Button>
                    <Button
                        variant={styles.buttonVariant}
                        onClick={handleConfirm}
                        disabled={loading}
                        className={cn(
                            variant === "danger" && "bg-red-600 hover:bg-red-700",
                            variant === "success" && "bg-emerald-600 hover:bg-emerald-700",
                            variant === "warning" && "bg-amber-600 hover:bg-amber-700",
                            variant === "info" && "bg-blue-600 hover:bg-blue-700",
                        )}
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Alert Dialog for simple notifications (replaces alert())
interface AlertDialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    variant?: ConfirmDialogVariant;
    icon?: React.ReactNode;
}

export function AlertDialog({
    isOpen,
    onClose,
    title,
    description,
    variant = "info",
    icon,
}: AlertDialogProps) {
    const styles = variantStyles[variant];

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 text-white">
                <DialogHeader className="gap-4">
                    <div className="flex items-start gap-4">
                        <div className={cn(
                            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
                            styles.iconBg,
                            styles.iconColor
                        )}>
                            {icon || styles.icon}
                        </div>
                        <div className="flex flex-col gap-1">
                            <DialogTitle className="text-lg font-semibold text-white">
                                {title}
                            </DialogTitle>
                            {description && (
                                <DialogDescription className="text-zinc-400">
                                    {description}
                                </DialogDescription>
                            )}
                        </div>
                    </div>
                </DialogHeader>
                <DialogFooter className="mt-4">
                    <Button
                        onClick={onClose}
                        className={cn(
                            variant === "danger" && "bg-red-600 hover:bg-red-700",
                            variant === "success" && "bg-emerald-600 hover:bg-emerald-700",
                            variant === "warning" && "bg-amber-600 hover:bg-amber-700",
                            variant === "info" && "bg-blue-600 hover:bg-blue-700",
                        )}
                    >
                        OK
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Custom hook to manage dialog state
export function useConfirmDialog() {
    const [state, setState] = React.useState<{
        isOpen: boolean;
        title: string;
        description?: string;
        variant?: ConfirmDialogVariant;
        confirmText?: string;
        cancelText?: string;
        icon?: React.ReactNode;
        onConfirm: () => void | Promise<void>;
    }>({
        isOpen: false,
        title: "",
        onConfirm: () => { },
    });

    const confirm = React.useCallback((options: {
        title: string;
        description?: string;
        variant?: ConfirmDialogVariant;
        confirmText?: string;
        cancelText?: string;
        icon?: React.ReactNode;
    }): Promise<boolean> => {
        return new Promise((resolve) => {
            setState({
                ...options,
                isOpen: true,
                onConfirm: () => {
                    setState((prev) => ({ ...prev, isOpen: false }));
                    resolve(true);
                },
            });
        });
    }, []);

    const close = React.useCallback(() => {
        setState((prev) => ({ ...prev, isOpen: false }));
    }, []);

    const DialogComponent = React.useMemo(() => {
        return (
            <ConfirmDialog
                isOpen={state.isOpen}
                onClose={close}
                onConfirm={state.onConfirm}
                title={state.title}
                description={state.description}
                variant={state.variant}
                confirmText={state.confirmText}
                cancelText={state.cancelText}
                icon={state.icon}
            />
        );
    }, [state, close]);

    return { confirm, DialogComponent };
}

// Custom hook for alert dialog
export function useAlertDialog() {
    const [state, setState] = React.useState<{
        isOpen: boolean;
        title: string;
        description?: string;
        variant?: ConfirmDialogVariant;
        icon?: React.ReactNode;
    }>({
        isOpen: false,
        title: "",
    });

    const alert = React.useCallback((options: {
        title: string;
        description?: string;
        variant?: ConfirmDialogVariant;
        icon?: React.ReactNode;
    }) => {
        setState({
            ...options,
            isOpen: true,
        });
    }, []);

    const close = React.useCallback(() => {
        setState((prev) => ({ ...prev, isOpen: false }));
    }, []);

    const DialogComponent = React.useMemo(() => {
        return (
            <AlertDialog
                isOpen={state.isOpen}
                onClose={close}
                title={state.title}
                description={state.description}
                variant={state.variant}
                icon={state.icon}
            />
        );
    }, [state, close]);

    return { alert, DialogComponent };
}
