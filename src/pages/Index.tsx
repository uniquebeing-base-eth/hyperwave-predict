import { useState, useCallback } from "react";
import { Routes, Route } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import ActionPage from "@/pages/ActionPage";
import RewardsPage from "@/pages/RewardsPage";
import StatsPage from "@/pages/StatsPage";
import RoundResult from "@/components/RoundResult";
import { useMiniAppPrompt } from "@/hooks/useMiniAppPrompt";

interface Bet {
  id: string;
  direction: "up" | "down";
  amount: number;
  result: "win" | "lose" | "pending";
  timestamp: Date;
}

const Index = () => {
  // Initialize mini app prompt
  useMiniAppPrompt();
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
      const result = outcomes[Math.floor(Math.random() * 10) % 3];
      setRoundResult(result);

      // Calculate change based on result
      const change = result === "up" ? Math.random() * 0.1 : result === "down" ? -Math.random() * 0.1 : 0;
      setPriceChange(change);

      if (currentBet) {
        const isWin = result === currentBet.direction;

        setTotalBets((prev) => prev + 1);
        setRewards((prev) => prev + 10);

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
        setUpOdds(50 + Math.floor(Math.random() * 10 - 5));
        setDownOdds(50 - Math.floor(Math.random() * 10 - 5));
      }, 3000);
    }, 2000);
  }, [currentBet]);

  return (
    <>
      <MainLayout balance={balance} isConnected={true}>
        <Routes>
          <Route
            index
            element={
              <ActionPage
                balance={balance}
                currentPrice={currentPrice}
                priceChange={priceChange}
                upOdds={upOdds}
                downOdds={downOdds}
                isBettingOpen={isBettingOpen}
                recentBets={recentBets}
                onPlaceBet={handlePlaceBet}
                onRoundComplete={handleRoundComplete}
              />
            }
          />
          <Route path="rewards" element={<RewardsPage rewards={rewards} />} />
          <Route
            path="stats"
            element={
              <StatsPage
                balance={balance}
                totalBets={totalBets}
                wins={wins}
                streak={streak}
              />
            }
          />
        </Routes>
      </MainLayout>

      {/* Result Modal */}
      <RoundResult
        result={roundResult}
        userBet={currentBet?.direction || null}
        amount={currentBet?.amount || 0}
        isVisible={showResult}
        onClose={() => setShowResult(false)}
      />
    </>
  );
};

export default Index;
