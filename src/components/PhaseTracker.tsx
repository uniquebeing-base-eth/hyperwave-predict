import { useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar, Gift, Timer } from "lucide-react";
import { useCountdown } from "@/hooks/useCountdown";

interface PhaseTrackerProps {
  currentPhase: number;
  daysRemaining: number;
  totalRewards: number;
  tokenSymbol: string;
}

const PhaseTracker = ({
  currentPhase,
  daysRemaining,
  totalRewards,
  tokenSymbol,
}: PhaseTrackerProps) => {
  // Memoize the phase end date to prevent recalculation on every render
  const phaseEndDate = useMemo(() => {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + daysRemaining);
    endDate.setHours(23, 59, 59, 999);
    return endDate;
  }, [daysRemaining]);
  
  const { days, hours, minutes, isEnded } = useCountdown(phaseEndDate);

  const progressPercentage = ((7 - daysRemaining) / 7) * 100;

  const formatCountdown = () => {
    if (isEnded) return "Phase Ended";
    
    const dayLabel = days === 1 ? "day" : "days";
    const hourLabel = hours === 1 ? "hour" : "hours";
    const minLabel = minutes === 1 ? "min" : "mins";
    
    return `${days} ${dayLabel} ${hours} ${hourLabel} ${minutes} ${minLabel}`;
  };

  return (
    <motion.div
      className="glass rounded-2xl p-5"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-accent" />
          <span className="text-sm font-display uppercase tracking-wider text-accent">
            Phase {currentPhase}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {tokenSymbol} Season
        </span>
      </div>

      {/* Countdown Timer */}
      <div className="mb-4 p-4 rounded-xl bg-muted/30 border border-border/50">
        <div className="flex items-center gap-2 mb-2">
          <Timer className="w-4 h-4 text-accent" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Time Remaining
          </span>
        </div>
        <motion.p
          className={`text-xl font-display font-bold ${
            isEnded ? "text-muted-foreground" : "text-accent text-glow-accent"
          }`}
          animate={!isEnded ? { opacity: [1, 0.8, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {formatCountdown()}
        </motion.p>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span>Progress</span>
          <span>{7 - daysRemaining}/7 days</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full bg-gradient-accent rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{
              boxShadow: "0 0 10px hsl(310 100% 50% / 0.5)",
            }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 mb-1">
            <Timer className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Time Left</span>
          </div>
          <span className="text-lg font-display font-bold text-foreground">
            {days}d {hours}h {minutes}m
          </span>
        </div>

        <div className="p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="w-3 h-3 text-accent" />
            <span className="text-xs text-muted-foreground">Rewards</span>
          </div>
          <span className="text-lg font-display font-bold text-accent text-glow-accent">
            {totalRewards.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Claim Info */}
      {isEnded && (
        <motion.div
          className="mt-4 p-3 rounded-lg bg-accent/20 border border-accent/30"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <p className="text-sm text-accent text-center font-medium">
            🎉 Rewards ready to claim!
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default PhaseTracker;
