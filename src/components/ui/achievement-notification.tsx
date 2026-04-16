"use client";

import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  Star,
  Zap,
  Users,
  Globe,
  Coins,
  Target,
  Clock,
  Shield,
  Gift,
  TrendingUp,
  Sparkles,
  CheckCircle,
  Trophy,
  X,
} from "lucide-react";
import { Button } from "@/components/ui";

// Achievement icons mapping
const ACHIEVEMENT_ICONS: Record<string, React.ReactNode> = {
  FIRST_SALE: <Star className="h-6 w-6" />,
  EARLY_ADOPTER: <Award className="h-6 w-6" />,
  RELIABLE_REVENUE: <TrendingUp className="h-6 w-6" />,
  SPEED_DEMON: <Zap className="h-6 w-6" />,
  TEAM_PLAYER: <Users className="h-6 w-6" />,
  GLOBAL_MERCHANT: <Globe className="h-6 w-6" />,
  CRYPTO_NATIVE: <Coins className="h-6 w-6" />,
  HUNDRED_CLUB: <Target className="h-6 w-6" />,
  THOUSAND_CLUB: <Trophy className="h-6 w-6" />,
  STREAK_MASTER: <Clock className="h-6 w-6" />,
  SECURITY_FIRST: <Shield className="h-6 w-6" />,
  REFERRAL_CHAMPION: <Gift className="h-6 w-6" />,
  ONBOARDING_COMPLETE: <CheckCircle className="h-6 w-6" />,
  VOLUME_ROOKIE: <Sparkles className="h-6 w-6" />,
  VOLUME_PRO: <Award className="h-6 w-6" />,
};

// Achievement definitions
const ACHIEVEMENT_DEFINITIONS: Record<string, {
  name: string;
  description: string;
  color: string;
  points: number;
}> = {
  FIRST_SALE: {
    name: "First Sale",
    description: "Received your first payment",
    color: "emerald",
    points: 100,
  },
  EARLY_ADOPTER: {
    name: "Early Adopter",
    description: "Joined before official launch",
    color: "purple",
    points: 250,
  },
  RELIABLE_REVENUE: {
    name: "Reliable Revenue",
    description: "30 consecutive days with payments",
    color: "cyan",
    points: 500,
  },
  SPEED_DEMON: {
    name: "Speed Demon",
    description: "Invoice paid within 1 hour",
    color: "yellow",
    points: 150,
  },
  TEAM_PLAYER: {
    name: "Team Player",
    description: "Invited 3+ team members",
    color: "blue",
    points: 200,
  },
  GLOBAL_MERCHANT: {
    name: "Global Merchant",
    description: "Payments from 5+ countries",
    color: "indigo",
    points: 300,
  },
  CRYPTO_NATIVE: {
    name: "Crypto Native",
    description: "Received 10+ different tokens",
    color: "orange",
    points: 350,
  },
  HUNDRED_CLUB: {
    name: "100 Club",
    description: "Completed 100 transactions",
    color: "amber",
    points: 400,
  },
  THOUSAND_CLUB: {
    name: "1000 Club",
    description: "Completed 1,000 transactions",
    color: "gold",
    points: 1000,
  },
  STREAK_MASTER: {
    name: "Streak Master",
    description: "30-day login streak",
    color: "red",
    points: 300,
  },
  SECURITY_FIRST: {
    name: "Security First",
    description: "Enabled Passkey authentication",
    color: "green",
    points: 50,
  },
  REFERRAL_CHAMPION: {
    name: "Referral Champion",
    description: "Referred 10+ merchants",
    color: "pink",
    points: 750,
  },
  ONBOARDING_COMPLETE: {
    name: "Onboarding Complete",
    description: "Completed all onboarding steps",
    color: "teal",
    points: 100,
  },
  VOLUME_ROOKIE: {
    name: "Volume Rookie",
    description: "Processed $1,000 in payments",
    color: "slate",
    points: 100,
  },
  VOLUME_PRO: {
    name: "Volume Pro",
    description: "Processed $100,000 in payments",
    color: "violet",
    points: 500,
  },
};

interface AchievementNotification {
  id: string;
  type: string;
  earnedAt: Date;
}

interface AchievementNotificationContextType {
  showAchievement: (type: string) => void;
  notifications: AchievementNotification[];
}

const AchievementNotificationContext = createContext<AchievementNotificationContextType>({
  showAchievement: () => {},
  notifications: [],
});

export function useAchievementNotification() {
  return useContext(AchievementNotificationContext);
}

interface AchievementNotificationProviderProps {
  children: React.ReactNode;
}

export function AchievementNotificationProvider({ children }: AchievementNotificationProviderProps) {
  const [notifications, setNotifications] = useState<AchievementNotification[]>([]);
  const [currentNotification, setCurrentNotification] = useState<AchievementNotification | null>(null);

  const showAchievement = useCallback((type: string) => {
    const notification: AchievementNotification = {
      id: `${type}-${Date.now()}`,
      type,
      earnedAt: new Date(),
    };
    setNotifications((prev) => [...prev, notification]);
  }, []);

  // Process queue - show one notification at a time
  useEffect(() => {
    if (notifications.length > 0 && !currentNotification) {
      const [next, ...rest] = notifications;
      setCurrentNotification(next);
      setNotifications(rest);
    }
  }, [notifications, currentNotification]);

  const handleDismiss = () => {
    setCurrentNotification(null);
  };

  const handleAutoClose = () => {
    setTimeout(() => {
      setCurrentNotification(null);
    }, 5000);
  };

  return (
    <AchievementNotificationContext.Provider value={{ showAchievement, notifications }}>
      {children}
      <AnimatePresence>
        {currentNotification && (
          <AchievementToast
            type={currentNotification.type}
            onDismiss={handleDismiss}
            onShow={handleAutoClose}
          />
        )}
      </AnimatePresence>
    </AchievementNotificationContext.Provider>
  );
}

interface AchievementToastProps {
  type: string;
  onDismiss: () => void;
  onShow: () => void;
}

function AchievementToast({ type, onDismiss, onShow }: AchievementToastProps) {
  const definition = ACHIEVEMENT_DEFINITIONS[type];
  const icon = ACHIEVEMENT_ICONS[type] || <Star className="h-6 w-6" />;

  useEffect(() => {
    onShow();
  }, [onShow]);

  if (!definition) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -100, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.9 }}
      transition={{ type: "spring", damping: 15, stiffness: 300 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[100]"
    >
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/90 to-orange-950/90 backdrop-blur-xl shadow-2xl shadow-amber-500/20">
        {/* Animated shine effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          initial={{ x: "-100%" }}
          animate={{ x: "200%" }}
          transition={{ duration: 1.5, repeat: 2, ease: "easeInOut" }}
        />

        <div className="relative p-4 pr-12">
          <div className="flex items-center gap-4">
            {/* Icon with glow */}
            <div className="relative">
              <div className="absolute inset-0 bg-amber-400/30 blur-xl rounded-full" />
              <div className={`relative h-14 w-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg`}>
                {icon}
              </div>
            </div>

            {/* Content */}
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-400" />
                <p className="text-xs font-medium text-amber-400 uppercase tracking-wide">
                  Achievement Unlocked!
                </p>
              </div>
              <h3 className="text-lg font-bold text-white mt-1">
                {definition.name}
              </h3>
              <p className="text-sm text-amber-200/70">
                {definition.description}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-xs font-medium text-purple-300">
                  <Star className="h-3 w-3" />
                  +{definition.points} points
                </span>
              </div>
            </div>
          </div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            className="absolute top-2 right-2 h-8 w-8 text-amber-400/50 hover:text-amber-400 hover:bg-amber-500/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress bar for auto-close */}
        <motion.div
          className="h-1 bg-gradient-to-r from-amber-400 to-orange-500"
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: 5, ease: "linear" }}
        />
      </div>
    </motion.div>
  );
}

// Standalone component for showing achievement toasts
export function AchievementEarned({
  type,
  show,
  onClose,
}: {
  type: string;
  show: boolean;
  onClose: () => void;
}) {
  if (!show) return null;
  
  return (
    <AnimatePresence>
      <AchievementToast type={type} onDismiss={onClose} onShow={() => {}} />
    </AnimatePresence>
  );
}
