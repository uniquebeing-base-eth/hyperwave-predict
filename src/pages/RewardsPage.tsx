import { motion } from "framer-motion";
import PhaseTracker from "@/components/PhaseTracker";

interface RewardsPageProps {
  rewards: number;
}

const RewardsPage = ({ rewards }: RewardsPageProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-md mx-auto space-y-6"
    >
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-lg md:text-xl font-display uppercase tracking-widest text-muted-foreground mb-2">
          Phase <span className="text-accent text-glow-accent">Rewards</span>
        </h2>
        <p className="text-sm text-muted-foreground">
          Track your phase progress and claim rewards.
        </p>
      </motion.div>

      <PhaseTracker
        currentPhase={1}
        daysRemaining={5}
        totalRewards={rewards}
        tokenSymbol="ETH"
      />
    </motion.div>
  );
};

export default RewardsPage;
