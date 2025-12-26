import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface BettingPanelProps {
  balance: number;
  onPlaceBet: (direction: "up" | "down", amount: number) => void;
  upOdds: number;
  downOdds: number;
  isBettingOpen: boolean;
  minimumStake?: number;
}

const BettingPanel = ({
  balance,
  onPlaceBet,
  upOdds,
  downOdds,
  isBettingOpen,
  minimumStake = 100000,
}: BettingPanelProps) => {
  const [betAmount, setBetAmount] = useState<number>(minimumStake);
  const [selectedDirection, setSelectedDirection] = useState<"up" | "down" | null>(null);

  const presetAmounts = [100000, 250000, 500000, 1000000];

  const handlePlaceBet = () => {
    if (!selectedDirection) {
      toast({
        title: "Select Direction",
        description: "Choose UP or DOWN to place your bet",
        variant: "destructive",
      });
      return;
    }

    if (betAmount > balance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough tokens for this bet",
        variant: "destructive",
      });
      return;
    }

    if (betAmount < minimumStake) {
      toast({
        title: "Below Minimum",
        description: `Minimum stake is ${minimumStake.toLocaleString()} $BLOOM`,
        variant: "destructive",
      });
      return;
    }

    onPlaceBet(selectedDirection, betAmount);
    setSelectedDirection(null);
    
    toast({
      title: "Bet Placed! 🎯",
      description: `${betAmount} tokens on ${selectedDirection.toUpperCase()}`,
    });
  };

  const upPercentage = Math.round((upOdds / (upOdds + downOdds)) * 100);
  const downPercentage = 100 - upPercentage;

  return (
    <motion.div
      className="glass rounded-2xl p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Direction Buttons */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant="up"
            size="xl"
            className={`w-full relative overflow-hidden ${
              selectedDirection === "up" ? "ring-2 ring-success ring-offset-2 ring-offset-background" : ""
            }`}
            onClick={() => setSelectedDirection("up")}
            disabled={!isBettingOpen}
          >
            <div className="flex flex-col items-center">
              <TrendingUp className="w-8 h-8 mb-1" />
              <span className="text-lg">UP</span>
              <span className="text-xs opacity-80">{upPercentage}% betting</span>
            </div>
            {selectedDirection === "up" && (
              <motion.div
                className="absolute inset-0 bg-success/20"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring" }}
              />
            )}
          </Button>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant="down"
            size="xl"
            className={`w-full relative overflow-hidden ${
              selectedDirection === "down" ? "ring-2 ring-danger ring-offset-2 ring-offset-background" : ""
            }`}
            onClick={() => setSelectedDirection("down")}
            disabled={!isBettingOpen}
          >
            <div className="flex flex-col items-center">
              <TrendingDown className="w-8 h-8 mb-1" />
              <span className="text-lg">DOWN</span>
              <span className="text-xs opacity-80">{downPercentage}% betting</span>
            </div>
            {selectedDirection === "down" && (
              <motion.div
                className="absolute inset-0 bg-danger/20"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring" }}
              />
            )}
          </Button>
        </motion.div>
      </div>

      {/* Odds Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span>Distribution</span>
          <span>2× Payout</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden flex bg-muted">
          <motion.div
            className="bg-gradient-up"
            style={{ width: `${upPercentage}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${upPercentage}%` }}
            transition={{ duration: 0.5 }}
          />
          <motion.div
            className="bg-gradient-down"
            style={{ width: `${downPercentage}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${downPercentage}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Bet Amount */}
      <div className="mb-6">
        <label className="block text-sm text-muted-foreground mb-3">Stake Amount</label>
        
        {/* Preset Buttons */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {presetAmounts.map((amount) => (
            <Button
              key={amount}
              variant={betAmount === amount ? "default" : "outline"}
              size="sm"
              onClick={() => setBetAmount(amount)}
              className="text-xs"
            >
              {amount}
            </Button>
          ))}
        </div>

        {/* Custom Input */}
        <div className="relative">
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(Math.max(0, Number(e.target.value)))}
            className="w-full h-12 px-4 rounded-lg bg-muted border border-border text-foreground text-lg font-display focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Enter amount"
            min={1}
            max={balance}
          />
          <button
            onClick={() => setBetAmount(balance)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary hover:text-primary/80 font-semibold uppercase"
          >
            Max
          </button>
        </div>

        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>Min: {minimumStake.toLocaleString()}</span>
          <span>Balance: {balance.toLocaleString()} $BLOOM</span>
        </div>
      </div>

      {/* Place Bet Button */}
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button
          variant={selectedDirection === "up" ? "up" : selectedDirection === "down" ? "down" : "neon"}
          size="xl"
          className="w-full"
          onClick={handlePlaceBet}
          disabled={!isBettingOpen || !selectedDirection}
        >
          <Zap className="w-5 h-5" />
          {isBettingOpen ? (
            selectedDirection ? `Place ${betAmount} on ${selectedDirection.toUpperCase()}` : "Select Direction"
          ) : (
            "Betting Closed"
          )}
        </Button>
      </motion.div>

      {/* Potential Win */}
      {selectedDirection && (
        <motion.div
          className="mt-4 p-3 rounded-lg bg-muted/50 text-center"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
        >
          <span className="text-sm text-muted-foreground">Potential Win: </span>
          <span className="text-lg font-display font-bold text-success text-glow-success">
            {(betAmount * 2).toLocaleString()} tokens
          </span>
        </motion.div>
      )}
    </motion.div>
  );
};

export default BettingPanel;
