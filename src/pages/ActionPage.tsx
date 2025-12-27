import { motion } from "framer-motion";
import PriceChart from "@/components/PriceChart";
import GameTimer, { GamePhase } from "@/components/GameTimer";
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
  upOdds: number;
  downOdds: number;
  isBettingOpen: boolean;
  recentBets: Bet[];
  onPlaceBet: (direction: "up" | "down", amount: number) => void;
  onPhaseChange: (phase: GamePhase) => void;
  onResolutionComplete: () => void;
  onPriceSnapshot: () => void;
  onPriceUpdate?: (price: number, change: number) => void;
  currentPhase: GamePhase;
  roundNumber: number;
  minimumStake: number;
  hasUserBetThisRound?: boolean;
  isPending?: boolean;
  isConnected?: boolean;
  onConnect?: () => Promise<void>;
}

const ActionPage = ({
  balance,
  upOdds,
  downOdds,
  isBettingOpen,
  recentBets,
  onPlaceBet,
  onPhaseChange,
  onResolutionComplete,
  onPriceSnapshot,
  onPriceUpdate,
  currentPhase,
  roundNumber,
  minimumStake,
  hasUserBetThisRound = false,
  isPending = false,
  isConnected = false,
  onConnect,
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
          Round <span className="text-primary text-glow-primary">#{roundNumber.toLocaleString()}</span>
        </h2>
        <p className="text-sm text-muted-foreground">
          Predict ETH price. <span className="text-success font-bold">Win 2×</span> your stake.
        </p>
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          <span className="px-2 py-0.5 rounded-full bg-primary/20 text-xs text-primary">
            Min: {minimumStake.toLocaleString()} $BLOOM
          </span>
          <span className="px-2 py-0.5 rounded-full bg-success/20 text-xs text-success">
            1 bet per round
          </span>
          <span className="px-2 py-0.5 rounded-full bg-warning/20 text-xs text-warning">
            60s rounds
          </span>
        </div>
      </motion.div>

      {/* Chart - Now with real ETH prices */}
      <PriceChart onPriceUpdate={onPriceUpdate} />

      {/* Timer */}
      <div className="flex justify-center">
        <GameTimer
          onPhaseChange={onPhaseChange}
          onResolutionComplete={onResolutionComplete}
          onPriceSnapshot={onPriceSnapshot}
        />
      </div>

      {/* Betting Panel - Now with on-chain support */}
      <BettingPanel
        balance={balance}
        onPlaceBet={onPlaceBet}
        upOdds={upOdds}
        downOdds={downOdds}
        isBettingOpen={isBettingOpen}
        minimumStake={minimumStake}
        hasUserBetThisRound={hasUserBetThisRound}
        isPending={isPending}
        isConnected={isConnected}
        onConnect={onConnect}
      />

      {/* Recent Bets */}
      <RecentBets bets={recentBets} />
    </motion.div>
  );
};

export default ActionPage;
