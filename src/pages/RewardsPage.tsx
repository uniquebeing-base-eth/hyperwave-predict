import { motion } from "framer-motion";
import PhaseTracker from "@/components/PhaseTracker";
import RewardsTracker from "@/components/RewardsTracker";
import { toast } from "sonner";

interface RewardsPageProps {
  rewards: number;
  daysPlayed?: number;
}

const RewardsPage = ({ rewards, daysPlayed = 0 }: RewardsPageProps) => {
  const canClaim = daysPlayed >= 7;

  const handleClaim = () => {
    if (canClaim) {
      toast.success("Rewards claimed!", {
        description: `You've claimed ${rewards.toLocaleString()} $BLOOM`,
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
          Phase <span className="text-accent text-glow-accent">Rewards</span>
        </h2>
        <p className="text-xs text-muted-foreground">
          Track your progress and claim rewards.
        </p>
      </motion.div>

      {/* Phase Progress - On Top */}
      <PhaseTracker
        currentPhase={1}
        daysRemaining={7 - daysPlayed}
        totalRewards={rewards}
        tokenSymbol="BLOOM"
      />

      {/* Claimable Rewards - At Bottom */}
      <RewardsTracker
        totalRewards={rewards}
        daysPlayed={daysPlayed}
        canClaim={canClaim}
        onClaim={handleClaim}
      />
    </motion.div>
  );
};

export default RewardsPage;
