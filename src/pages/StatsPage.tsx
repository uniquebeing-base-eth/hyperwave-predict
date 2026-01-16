
import { motion } from "framer-motion";
import UserStats from "@/components/UserStats";
import { useRelativePerformance } from "@/hooks/useRelativePerformance";

interface StatsPageProps {
  ethBalance: number;
  bloomBalance: number;
  totalBets: number;
  wins: number;
  streak: number;
}

const StatsPage = ({ ethBalance, bloomBalance, totalBets, wins, streak }: StatsPageProps) => {
  const { percentile } = useRelativePerformance();
  const vaultAmount = totalBets * 1000; // Phase vault rewards

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
          Your <span className="text-primary text-glow-primary">Stats</span>
        </h2>
        <p className="text-sm text-muted-foreground">
          Track your performance and progress.
        </p>
      </motion.div>

      <UserStats
        ethBalance={ethBalance}
        bloomBalance={bloomBalance}
        totalBets={totalBets}
        wins={wins}
        streak={streak}
        percentile={percentile}
        vaultAmount={vaultAmount}
      />
    </motion.div>
  );
};

export default StatsPage;
