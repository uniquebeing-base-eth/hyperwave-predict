import { useState, useCallback, useRef, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import ActionPage from "@/pages/ActionPage";
import RewardsPage from "@/pages/RewardsPage";
import StatsPage from "@/pages/StatsPage";
import RoundResult from "@/components/RoundResult";
import { useMiniAppPrompt } from "@/hooks/useMiniAppPrompt";
import { useNeynarBalances } from "@/hooks/useNeynarBalances";
import { GamePhase } from "@/components/GameTimer";
import { useSoundEffects } from "@/hooks/useSoundEffects";
interface Bet {
  id: string;
  direction: "up" | "down";
  amount: number;
  result: "win" | "lose" | "pending";
  timestamp: Date;
}

const MINIMUM_STAKE = 100000; // 100,000 BLOOM minimum

const Index = () => {
  // Initialize mini app prompt
  useMiniAppPrompt();
  
  // Sound effects
  const { preloadSounds, playWinSound, playLoseSound, playBetSound } = useSoundEffects();
  
  // Preload sounds on mount
  useEffect(() => {
    preloadSounds();
  }, [preloadSounds]);
  
  // Wallet balances via Neynar
  const { ethBalance, bloomBalance } = useNeynarBalances();
  const bloomBalanceNum = parseFloat(bloomBalance.replace(/,/g, '')) || 0;
  const ethBalanceNum = parseFloat(ethBalance) || 0;
  
  // Game state
  const [currentPhase, setCurrentPhase] = useState<GamePhase>("betting");
  const [totalBets, setTotalBets] = useState(0);
  const [wins, setWins] = useState(0);
  const [streak, setStreak] = useState(0);
  const [rewards, setRewards] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);

  // Betting state
  const [currentBet, setCurrentBet] = useState<{ direction: "up" | "down"; amount: number } | null>(null);
  const [recentBets, setRecentBets] = useState<Bet[]>([]);

  // Odds (based on pool distribution)
  const [upOdds, setUpOdds] = useState(50);
  const [downOdds, setDownOdds] = useState(50);

  // Price state from real ETH data
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);
  const startPriceRef = useRef<number>(0);
  const endPriceRef = useRef<number>(0);

  // Result modal
  const [showResult, setShowResult] = useState(false);
  const [roundResult, setRoundResult] = useState<"up" | "down" | "draw" | null>(null);

  // Track daily streak
  const lastPlayedDayRef = useRef<string | null>(null);

  const updateStreak = useCallback(() => {
    const today = new Date().toDateString();
    if (lastPlayedDayRef.current === today) {
      // Already played today, streak doesn't change
      return;
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastPlayedDayRef.current === yesterday.toDateString()) {
      // Played yesterday, increment streak
      setStreak(prev => prev + 1);
    } else if (lastPlayedDayRef.current !== today) {
      // Missed a day or first time, set streak to 1
      setStreak(1);
    }
    
    lastPlayedDayRef.current = today;
  }, []);

  const handlePriceUpdate = useCallback((price: number, change: number) => {
    setCurrentPrice(price);
    setPriceChange(change);
    
    // Set start price when betting phase begins
    if (currentPhase === "betting" && startPriceRef.current === 0) {
      startPriceRef.current = price;
    }
  }, [currentPhase]);

  const handlePhaseChange = useCallback((phase: GamePhase) => {
    setCurrentPhase(phase);
    
    if (phase === "betting") {
      // New round starting
      startPriceRef.current = currentPrice;
      setRoundNumber(prev => prev + 1);
    }
  }, [currentPrice]);

  const handlePriceSnapshot = useCallback(() => {
    endPriceRef.current = currentPrice;
  }, [currentPrice]);

  const handlePlaceBet = (direction: "up" | "down", amount: number) => {
    // Check if user already placed a bet this round
    if (currentBet !== null) {
      return;
    }
    
    // Check minimum stake
    if (amount < MINIMUM_STAKE) {
      return;
    }

    // Check if betting is allowed
    if (currentPhase !== "betting") {
      return;
    }

    // Check wallet balance
    if (amount > bloomBalanceNum) {
      return;
    }

    setCurrentBet({ direction, amount });
    
    // Play bet sound
    playBetSound();

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

    // Update streak for playing today
    updateStreak();
  };

  const handleResolutionComplete = useCallback(() => {
    // Determine result based on price movement
    const startPrice = startPriceRef.current;
    const endPrice = endPriceRef.current || currentPrice;
    
    let result: "up" | "down" | "draw";
    if (endPrice > startPrice) {
      result = "up";
    } else if (endPrice < startPrice) {
      result = "down";
    } else {
      result = "draw"; // Draw = loss in HyperWave
    }
    
    setRoundResult(result);

    if (currentBet) {
      const isWin = result === currentBet.direction;
      // DRAWS ARE LOSSES in HyperWave! No refunds.
      const isDraw = result === "draw";

      setTotalBets((prev) => prev + 1);
      setRewards((prev) => prev + 1000); // 1000 BLOOM reward for playing

      if (isWin) {
        setWins((prev) => prev + 1);
        playWinSound();
        // Winner gets 2x payout instantly (simulated - actual contract does this)
      } else {
        playLoseSound();
      }
      // Losses and draws - funds stay in contract (house wins)

      // Update recent bets - draws count as losses now
      setRecentBets((prev) =>
        prev.map((bet) =>
          bet.result === "pending"
            ? { ...bet, result: isWin ? "win" : "lose" } // Draw = lose
            : bet
        )
      );

      setShowResult(true);
    }

    // Reset for next round - instant, no delay
    setTimeout(() => {
      setCurrentBet(null);
      setUpOdds(50);
      setDownOdds(50);
      startPriceRef.current = 0;
      endPriceRef.current = 0;
    }, 2000); // Quick reset for HyperWave pace
  }, [currentBet, currentPrice, playWinSound, playLoseSound]);

  // Calculate if betting is allowed
  const isBettingOpen = currentPhase === "betting";

  return (
    <>
      <MainLayout>
        <Routes>
          <Route
            index
            element={
              <ActionPage
                balance={bloomBalanceNum}
                upOdds={upOdds}
                downOdds={downOdds}
                isBettingOpen={isBettingOpen}
                recentBets={recentBets}
                onPlaceBet={handlePlaceBet}
                onPhaseChange={handlePhaseChange}
                onResolutionComplete={handleResolutionComplete}
                onPriceSnapshot={handlePriceSnapshot}
                onPriceUpdate={handlePriceUpdate}
                currentPhase={currentPhase}
                roundNumber={roundNumber}
                minimumStake={MINIMUM_STAKE}
              />
            }
          />
          <Route path="rewards" element={<RewardsPage rewards={rewards} daysPlayed={streak} />} />
          <Route
            path="stats"
            element={
              <StatsPage
                ethBalance={ethBalanceNum}
                bloomBalance={bloomBalanceNum}
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
