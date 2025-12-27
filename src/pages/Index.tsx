import { useState, useCallback, useRef, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { ethers } from "ethers";
import MainLayout from "@/components/MainLayout";
import ActionPage from "@/pages/ActionPage";
import RewardsPage from "@/pages/RewardsPage";
import StatsPage from "@/pages/StatsPage";
import RoundResult from "@/components/RoundResult";
import { useMiniAppPrompt } from "@/hooks/useMiniAppPrompt";
import { useBloomBetting } from "@/hooks/useBloomBetting";
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

const Index = () => {
  // Initialize mini app prompt
  useMiniAppPrompt();
  
  // Sound effects
  const { preloadSounds, playWinSound, playLoseSound, playBetSound } = useSoundEffects();
  
  // On-chain betting hook
  const {
    isConnected,
    userAddress,
    bloomBalance,
    bloomDecimals,
    currentRound,
    userStats,
    hasUserBetThisRound,
    isBettingOpen: contractBettingOpen,
    minimumStake,
    isPending,
    connect,
    placeBet: onChainPlaceBet,
    refreshData,
  } = useBloomBetting();

  // Farcaster (Neynar) balances for accurate display in mini app
  const neynarBalances = useNeynarBalances();
  const parseLocaleNumber = (value: string) => Number((value || "0").replace(/,/g, ""));

  const bloomBalanceNum = Number(ethers.formatUnits(bloomBalance, bloomDecimals));
  const minimumStakeNum = Number(ethers.formatUnits(minimumStake, bloomDecimals));

  const neynarBloomNum = parseLocaleNumber(neynarBalances.bloomBalance);
  const neynarEthNum = Number(neynarBalances.ethBalance || "0");

  // Prefer Neynar-derived balances inside Farcaster mini app when available,
  // but only if it matches the connected wallet address (to avoid showing the wrong wallet's funds).
  const isSameWallet =
    !!userAddress &&
    !!neynarBalances.address &&
    userAddress.toLowerCase() === neynarBalances.address.toLowerCase();

  const displayBloomBalanceNum = isSameWallet ? neynarBloomNum : bloomBalanceNum;
  const displayEthBalanceNum = isSameWallet ? neynarEthNum : 0;
  // Preload sounds on mount
  useEffect(() => {
    preloadSounds();
  }, [preloadSounds]);
  
  // Game state
  const [currentPhase, setCurrentPhase] = useState<GamePhase>("betting");
  const [roundNumber, setRoundNumber] = useState(1);

  // Betting state
  const [currentBet, setCurrentBet] = useState<{ direction: "up" | "down"; amount: number } | null>(null);
  const [recentBets, setRecentBets] = useState<Bet[]>([]);

  // Odds (based on pool distribution from contract)
  const upPool = currentRound ? Number(currentRound.totalUpPool) : 50;
  const downPool = currentRound ? Number(currentRound.totalDownPool) : 50;
  const totalPool = upPool + downPool;
  const upOdds = totalPool > 0 ? Math.round((upPool / totalPool) * 100) : 50;
  const downOdds = totalPool > 0 ? Math.round((downPool / totalPool) * 100) : 50;

  // Price state from real ETH data
  const [currentPrice, setCurrentPrice] = useState(0);
  const startPriceRef = useRef<number>(0);
  const endPriceRef = useRef<number>(0);

  // Result modal
  const [showResult, setShowResult] = useState(false);
  const [roundResult, setRoundResult] = useState<"up" | "down" | "draw" | null>(null);

  // Stats from contract
  const totalBets = userStats ? Number(userStats.totalBets) : 0;
  const wins = userStats ? Number(userStats.totalWins) : 0;
  const streak = userStats ? Number(userStats.currentStreak) : 0;
  const rewards = totalBets * 1000; // Estimated rewards

  const handlePriceUpdate = useCallback((price: number, change: number) => {
    setCurrentPrice(price);
    
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
      setCurrentBet(null);
      refreshData(); // Refresh contract data on new round
    }
  }, [currentPrice, refreshData]);

  const handlePriceSnapshot = useCallback(() => {
    endPriceRef.current = currentPrice;
  }, [currentPrice]);

  // Handle on-chain bet placement
  const handlePlaceBet = useCallback(async (direction: "up" | "down", amount: number) => {
    // Check if user already placed a bet this round
    if (hasUserBetThisRound || currentBet !== null) {
      return;
    }
    
    // Check if betting is allowed
    if (currentPhase !== "betting") {
      return;
    }

    // Check wallet balance (use Neynar display balance in Farcaster)
    if (amount > displayBloomBalanceNum) {
      return;
    }

    // Convert to bigint for contract using correct decimals
    const amountInWei = ethers.parseUnits(amount.toString(), bloomDecimals);
    
    // Place bet on-chain
    const success = await onChainPlaceBet(direction, amountInWei);
    
    if (success) {
      setCurrentBet({ direction, amount });
      playBetSound();

      // Add to recent bets as pending
      const newBet: Bet = {
        id: Date.now().toString(),
        direction,
        amount,
        result: "pending",
        timestamp: new Date(),
      };
      setRecentBets((prev) => [newBet, ...prev.slice(0, 9)]);
    }
  }, [hasUserBetThisRound, currentBet, currentPhase, displayBloomBalanceNum, bloomDecimals, onChainPlaceBet, playBetSound]);

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

      if (isWin) {
        playWinSound();
      } else {
        playLoseSound();
      }

      // Update recent bets - draws count as losses
      setRecentBets((prev) =>
        prev.map((bet) =>
          bet.result === "pending"
            ? { ...bet, result: isWin ? "win" : "lose" }
            : bet
        )
      );

      setShowResult(true);
    }

    // Refresh contract data
    refreshData();

    // Reset for next round
    setTimeout(() => {
      setCurrentBet(null);
      startPriceRef.current = 0;
      endPriceRef.current = 0;
    }, 2000);
  }, [currentBet, currentPrice, playWinSound, playLoseSound, refreshData]);

  // Calculate if betting is allowed (use local phase + contract state)
  const isBettingOpen = currentPhase === "betting" && !hasUserBetThisRound;

  return (
    <>
      <MainLayout>
        <Routes>
          <Route
            index
            element={
              <ActionPage
                balance={displayBloomBalanceNum}
                upOdds={upOdds || 50}
                downOdds={downOdds || 50}
                isBettingOpen={isBettingOpen}
                recentBets={recentBets}
                onPlaceBet={handlePlaceBet}
                onPhaseChange={handlePhaseChange}
                onResolutionComplete={handleResolutionComplete}
                onPriceSnapshot={handlePriceSnapshot}
                onPriceUpdate={handlePriceUpdate}
                currentPhase={currentPhase}
                roundNumber={currentRound ? Number(currentRound.roundId) : roundNumber}
                minimumStake={minimumStakeNum || 100000}
                hasUserBetThisRound={hasUserBetThisRound}
                isPending={isPending}
                isConnected={isConnected}
                onConnect={connect}
              />
            }
          />
          <Route path="rewards" element={<RewardsPage rewards={rewards} daysPlayed={streak} />} />
          <Route
            path="stats"
            element={
              <StatsPage
                ethBalance={displayEthBalanceNum}
                bloomBalance={displayBloomBalanceNum}
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
