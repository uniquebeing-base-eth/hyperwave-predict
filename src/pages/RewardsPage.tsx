

import { motion } from "framer-motion";
import PhaseTracker from "@/components/PhaseTracker";
import RewardsTracker from "@/components/RewardsTracker";
import { usePhaseState } from "@/hooks/usePhaseState";
import { toast } from "sonner";

interface RewardsPageProps {
  rewards: number;
  streak?: number;
}

const RewardsPage = ({ rewards, streak = 0 }: RewardsPageProps) => {
  const { phaseNumber, daysRemaining, daysCompleted } = usePhaseState();
  
  // Streak is the user's personal consecutive days played
  // Phase is global 7-day cycle for all users
  const canClaim = streak >= 7;

  const handleClaim = () => {
    if (canClaim) {
      toast.success("Rewards claimed!", {
        description: `You've claimed ${rewards.toLocaleString()} $BLOOM with 2x multiplier!`,
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-md mx-auto space-y-5"
    >
      <motion.div
        className="text-center mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-lg font-display uppercase tracking-widest text-muted-foreground mb-1">
          Phase <span className="text-accent text-glow-accent">{phaseNumber}</span> Rewards
        </h2>
        <p className="text-xs text-muted-foreground">
          Track your progress and claim rewards.
        </p>
      </motion.div>

      {/* Phase Progress - On Top (Global 7-day cycle) */}
      <PhaseTracker
        currentPhase={phaseNumber}
        daysRemaining={daysRemaining}
        totalRewards={rewards}
        tokenSymbol="BLOOM"
      />

      {/* Claimable Rewards - At Bottom (Personal streak) */}
      <RewardsTracker
        totalRewards={rewards}
        daysPlayed={streak}
        canClaim={canClaim}
        onClaim={handleClaim}
      />
    </motion.div>
  );
};

export default RewardsPage;
