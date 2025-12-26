import { motion } from "framer-motion";
import PriceChart from "@/components/PriceChart";
import CountdownTimer from "@/components/CountdownTimer";
import BettingPanel from "@/components/BettingPanel";
import RecentBets from "@/components/RecentBets";

interface Bet {
  id: string;
  direction: "up" | "down";
  amount: number;
  result: "win" | "lose" | "pending";
  timestamp: Date;
}

interface ActionPageProps {
  balance: number;
  currentPrice: number;
  priceChange: number;
  upOdds: number;
  downOdds: number;
  isBettingOpen: boolean;
  recentBets: Bet[];
  onPlaceBet: (direction: "up" | "down", amount: number) => void;
  onRoundComplete: () => void;
}

const ActionPage = ({
  balance,
  currentPrice,
  priceChange,
  upOdds,
  downOdds,
  isBettingOpen,
  recentBets,
  onPlaceBet,
  onRoundComplete,
}: ActionPageProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Hero Section */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-lg md:text-xl font-display uppercase tracking-widest text-muted-foreground mb-2">
          Round <span className="text-primary text-glow-primary">#1,247</span>
        </h2>
        <p className="text-sm text-muted-foreground">
          Predict the next move. Win 2× your stake.
        </p>
      </motion.div>

      {/* Chart */}
      <PriceChart currentPrice={currentPrice} priceChange={priceChange} />

      {/* Timer */}
      <div className="flex justify-center">
        <CountdownTimer
          duration={60}
          onComplete={onRoundComplete}
          isActive={true}
        />
      </div>

      {/* Betting Panel */}
      <BettingPanel
        balance={balance}
        onPlaceBet={onPlaceBet}
        upOdds={upOdds}
        downOdds={downOdds}
        isBettingOpen={isBettingOpen}
      />

      {/* Recent Bets */}
      <RecentBets bets={recentBets} />
    </motion.div>
  );
};

export default ActionPage;
