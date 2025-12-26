import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import PriceChart from "@/components/PriceChart";
import CountdownTimer from "@/components/CountdownTimer";
import BettingPanel from "@/components/BettingPanel";
import PhaseTracker from "@/components/PhaseTracker";
import UserStats from "@/components/UserStats";
import RecentBets from "@/components/RecentBets";
import RoundResult from "@/components/RoundResult";

interface Bet {
  id: string;
  direction: "up" | "down";
  amount: number;
  result: "win" | "lose" | "pending";
  timestamp: Date;
}

const Index = () => {
  // User state
  const [balance, setBalance] = useState(1000);
  const [totalBets, setTotalBets] = useState(0);
  const [wins, setWins] = useState(0);
  const [streak, setStreak] = useState(0);
  const [rewards, setRewards] = useState(0);

  // Betting state
  const [currentBet, setCurrentBet] = useState<{ direction: "up" | "down"; amount: number } | null>(null);
  const [recentBets, setRecentBets] = useState<Bet[]>([]);
  const [isBettingOpen, setIsBettingOpen] = useState(true);

  // Odds (simulated)
  const [upOdds, setUpOdds] = useState(55);
  const [downOdds, setDownOdds] = useState(45);

  // Price state
  const [currentPrice] = useState(3456.78);
  const [priceChange, setPriceChange] = useState(0.0234);

  // Result modal
  const [showResult, setShowResult] = useState(false);
  const [roundResult, setRoundResult] = useState<"up" | "down" | "draw" | null>(null);

  const handlePlaceBet = (direction: "up" | "down", amount: number) => {
    if (amount > balance) return;

    setBalance((prev) => prev - amount);
    setCurrentBet({ direction, amount });

    // Update odds dynamically
    if (direction === "up") {
      setUpOdds((prev) => Math.min(prev + 5, 80));
      setDownOdds((prev) => Math.max(prev - 5, 20));
    } else {
      setDownOdds((prev) => Math.min(prev + 5, 80));
      setUpOdds((prev) => Math.max(prev - 5, 20));
    }

    // Add to recent bets as pending
    const newBet: Bet = {
      id: Date.now().toString(),
      direction,
      amount,
      result: "pending",
      timestamp: new Date(),
    };
    setRecentBets((prev) => [newBet, ...prev.slice(0, 9)]);
  };

  const handleRoundComplete = useCallback(() => {
    setIsBettingOpen(false);

    // Simulate result after brief delay
    setTimeout(() => {
      const outcomes: ("up" | "down" | "draw")[] = ["up", "down", "draw"];
      const result = outcomes[Math.floor(Math.random() * 10) % 3]; // Weighted towards up/down
      setRoundResult(result);

      // Calculate change based on result
      const change = result === "up" ? Math.random() * 0.1 : result === "down" ? -Math.random() * 0.1 : 0;
      setPriceChange(change);

      if (currentBet) {
        const isWin = result === currentBet.direction;
        const isDraw = result === "draw";

        setTotalBets((prev) => prev + 1);
        setRewards((prev) => prev + 10); // Reward tokens for every bet

        if (isWin) {
          setBalance((prev) => prev + currentBet.amount * 2);
          setWins((prev) => prev + 1);
          setStreak((prev) => prev + 1);
        } else {
          setStreak(0);
        }

        // Update recent bets
        setRecentBets((prev) =>
          prev.map((bet) =>
            bet.result === "pending"
              ? { ...bet, result: isWin ? "win" : "lose" }
              : bet
          )
        );

        setShowResult(true);
      }

      // Reset for next round
      setTimeout(() => {
        setCurrentBet(null);
        setIsBettingOpen(true);
        // Reset odds slightly
        setUpOdds(50 + Math.floor(Math.random() * 10 - 5));
        setDownOdds(50 - Math.floor(Math.random() * 10 - 5));
      }, 3000);
    }, 2000);
  }, [currentBet]);

  return (
    <div className="min-h-screen bg-background bg-gradient-hero">
      <Header balance={balance} isConnected={true} />

      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute top-1/4 -left-32 w-64 h-64 bg-primary/5 rounded-full blur-3xl"
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/5 rounded-full blur-3xl"
          animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
          transition={{ duration: 12, repeat: Infinity }}
        />
      </div>

      <main className="container mx-auto px-4 pt-24 pb-12 relative z-10">
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

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Stats */}
          <div className="lg:col-span-3 space-y-6">
            <UserStats
              balance={balance}
              totalBets={totalBets}
              wins={wins}
              streak={streak}
            />
            <PhaseTracker
              currentPhase={1}
              daysRemaining={5}
              totalRewards={rewards}
              tokenSymbol="ETH"
            />
          </div>

          {/* Center Column - Chart & Timer */}
          <div className="lg:col-span-6 space-y-6">
            <PriceChart currentPrice={currentPrice} priceChange={priceChange} />
            
            <div className="flex justify-center">
              <CountdownTimer
                duration={60}
                onComplete={handleRoundComplete}
                isActive={true}
              />
            </div>
          </div>

          {/* Right Column - Betting */}
          <div className="lg:col-span-3 space-y-6">
            <BettingPanel
              balance={balance}
              onPlaceBet={handlePlaceBet}
              upOdds={upOdds}
              downOdds={downOdds}
              isBettingOpen={isBettingOpen}
            />
            <RecentBets bets={recentBets} />
          </div>
        </div>
      </main>

      {/* Result Modal */}
      <RoundResult
        result={roundResult}
        userBet={currentBet?.direction || null}
        amount={currentBet?.amount || 0}
        isVisible={showResult}
        onClose={() => setShowResult(false)}
      />
    </div>
  );
};

export default Index;
