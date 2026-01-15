import { useState, useCallback, useRef, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { formatUnits, parseUnits } from "viem";
import { useReadContract } from "wagmi";
import MainLayout from "@/components/MainLayout";
import ActionPage from "@/pages/ActionPage";
import RewardsPage from "@/pages/RewardsPage";
import StatsPage from "@/pages/StatsPage";
import LeaderboardPage from "@/pages/LeaderboardPage";
import RoundResult from "@/components/RoundResult";
import { useMiniAppPrompt } from "@/hooks/useMiniAppPrompt";
import { useWagmiBetting } from "@/hooks/useWagmiBetting";
import { useNeynarBalances } from "@/hooks/useNeynarBalances";
import { GamePhase } from "@/components/GameTimer";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { BLOOM_BETTING_ABI, BLOOM_BETTING_ADDRESS, Direction } from "@/lib/wagmiConfig";

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

  // On-chain betting hook using wagmi + Farcaster connector
  const {
    isConnected,
    bloomBalance,
    bloomDecimals,
    currentRound,
    userStats,
    hasUserBetThisRound,
    isBettingOpen: contractBettingOpen,
    timeRemaining,
    minimumStake,
    roundBetCount,
    isPending,
    connect,
    placeBet: onChainPlaceBet,
    refreshData,
  } = useWagmiBetting();

  // Farcaster (Neynar) balances for accurate display in mini app
  const neynarBalances = useNeynarBalances();
  const parseLocaleNumber = (value: string) => Number((value || "0").replace(/,/g, ""));

  const bloomBalanceNum = Number(formatUnits(bloomBalance, bloomDecimals));
  const minimumStakeNum = Number(formatUnits(minimumStake, bloomDecimals));

  const neynarBloomNum = parseLocaleNumber(neynarBalances.bloomBalance);
  const neynarEthNum = Number(neynarBalances.ethBalance || "0");

  // Prefer Neynar-derived balances inside Farcaster mini app when available
  const displayBloomBalanceNum = neynarBalances.address ? neynarBloomNum : bloomBalanceNum;
  const displayEthBalanceNum = neynarBalances.address ? neynarEthNum : 0;

  // Preload sounds on mount
  useEffect(() => {
    preloadSounds();
  }, [preloadSounds]);

  // Game state
  const [currentPhase, setCurrentPhase] = useState<GamePhase>("betting");
  const [roundNumber] = useState(1);

  // Betting state
  const [currentBet, setCurrentBet] = useState<{
    roundId: bigint;
    direction: "up" | "down";
    amount: number;
  } | null>(null);
  const [recentBets, setRecentBets] = useState<Bet[]>([]);

  // Watch the specific round the user bet on so we don't miss the result if the contract
  // immediately rolls into the next round.
  const betRoundId = currentBet?.roundId;
  const { data: betRoundData } = useReadContract({
    address: BLOOM_BETTING_ADDRESS,
    abi: BLOOM_BETTING_ABI,
    functionName: "getRound",
    args: betRoundId ? [betRoundId] : undefined,
    query: { enabled: !!betRoundId, refetchInterval: 5000 },
  });
  // Odds (based on pool distribution from contract)
  const upPool = currentRound ? Number(currentRound.totalUpPool) : 50;
  const downPool = currentRound ? Number(currentRound.totalDownPool) : 50;
  const totalPool = upPool + downPool;
  const upOdds = totalPool > 0 ? Math.round((upPool / totalPool) * 100) : 50;
  const downOdds = totalPool > 0 ? Math.round((downPool / totalPool) * 100) : 50;

  // Price state from real ETH data (visual only)
  const [currentPrice, setCurrentPrice] = useState(0);
  const startPriceRef = useRef<number>(0);
  const endPriceRef = useRef<number>(0);

  // Settlement + UI sync helpers
  const lastOracleActionRef = useRef<
    | {
        roundId: bigint;
        stage: "settle" | "start";
        at: number;
      }
    | null
  >(null);
  const handledSettledRoundRef = useRef<bigint | null>(null);

  // Result modal
  const [showResult, setShowResult] = useState(false);
  const [roundResult, setRoundResult] = useState<"up" | "down" | "draw" | null>(null);

  // Stats from contract
  const totalBets = userStats ? Number(userStats.totalBets) : 0;
  const wins = userStats ? Number(userStats.totalWins) : 0;
  const streak = userStats ? Number(userStats.currentStreak) : 0;
  const rewards = totalBets * 1000; // Estimated rewards

  const handlePriceUpdate = useCallback(
    (price: number) => {
      setCurrentPrice(price);

      // Set start price when betting phase begins (visual only)
      if (currentPhase === "betting" && startPriceRef.current === 0) {
        startPriceRef.current = price;
      }
    },
    [currentPhase]
  );

  const handlePhaseChange = useCallback(
    (phase: GamePhase) => {
      setCurrentPhase(phase);

      if (phase === "betting") {
        // New round starting (visual only)
        startPriceRef.current = currentPrice;
        refreshData();
      }
    },
    [currentPrice, refreshData]
  );

  const handlePriceSnapshot = useCallback(() => {
    endPriceRef.current = currentPrice;
  }, [currentPrice]);

  const handlePlaceBet = useCallback(
    async (direction: "up" | "down", amount: number) => {
      // Check if user already placed a bet this round
      if (hasUserBetThisRound || currentBet !== null) {
        return;
      }

      // Check on-chain contract betting window (ignore local phase)
      if (!contractBettingOpen) {
        return;
      }

      // Check wallet balance (use Neynar display balance in Farcaster)
      if (amount > displayBloomBalanceNum) {
        return;
      }

      // Convert to bigint for contract using correct decimals
      const amountInWei = parseUnits(amount.toString(), bloomDecimals);

      // Place bet on-chain
      const success = await onChainPlaceBet(direction, amountInWei);

      if (success) {
        const activeRoundId = currentRound?.roundId ?? 0n;
        setCurrentBet({ roundId: activeRoundId, direction, amount });
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
    },
    [
      hasUserBetThisRound,
      currentBet,
      contractBettingOpen,
      displayBloomBalanceNum,
      bloomDecimals,
      onChainPlaceBet,
      playBetSound,
      currentRound?.roundId,
    ]
  );

  // If a round is sitting at 0s (ended) for a long time, trigger backend automation
  // so settlement + next round start happens promptly.
  useEffect(() => {
    if (!currentRound) return;
    if (timeRemaining !== 0) return;

    const stage: "settle" | "start" = currentRound.resolved ? "start" : "settle";
    const last = lastOracleActionRef.current;

    // Debounce: one call per round+stage every ~25s max
    if (
      last &&
      last.roundId === currentRound.roundId &&
      last.stage === stage &&
      Date.now() - last.at < 25_000
    ) {
      return;
    }

    lastOracleActionRef.current = {
      roundId: currentRound.roundId,
      stage,
      at: Date.now(),
    };

    supabase.functions
      .invoke("oracle-automation")
      .then(({ data, error }) => {
        if (error) {
          console.error("oracle-automation invoke error:", error);
          return;
        }

        if (data?.action && data.action !== "none") {
          toast({
            title: "Syncing round...",
            description: data.action === "settleRound" ? "Settling on-chain" : "Starting next round",
          });
        }
      })
      .catch((e) => console.error("oracle-automation invoke failed:", e));
  }, [currentRound, timeRemaining]);

  // Show results ONLY when the bet's round is resolved on-chain.
  useEffect(() => {
    if (!currentBet || !betRoundData) return;

    const round = betRoundData as any;
    if (!round.resolved) return;

    if (handledSettledRoundRef.current === currentBet.roundId) return;
    handledSettledRoundRef.current = currentBet.roundId;

    const result: "up" | "down" | "draw" =
      round.result === Direction.Up
        ? "up"
        : round.result === Direction.Down
          ? "down"
          : "draw";

    setRoundResult(result);

    const isWin = result !== "draw" && result === currentBet.direction;
    if (isWin) {
      playWinSound();
    } else {
      playLoseSound();
    }

    setRecentBets((prev) =>
      prev.map((bet) =>
        bet.result === "pending" ? { ...bet, result: isWin ? "win" : "lose" } : bet
      )
    );

    setShowResult(true);
    refreshData();

    setTimeout(() => {
      setCurrentBet(null);
      startPriceRef.current = 0;
      endPriceRef.current = 0;
    }, 2000);
  }, [betRoundData, currentBet, playWinSound, playLoseSound, refreshData]);

  // Calculate if betting is allowed - rely ONLY on contract state, not local timer
  const isBettingOpen = (contractBettingOpen ?? false) && !hasUserBetThisRound;

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
                onResolutionComplete={() => undefined}
                onPriceSnapshot={handlePriceSnapshot}
                onPriceUpdate={handlePriceUpdate}
                currentPhase={currentPhase}
                roundNumber={currentRound ? Number(currentRound.roundId) : roundNumber}
                minimumStake={minimumStakeNum || 100000}
                roundBetCount={roundBetCount}
                contractTimeRemaining={timeRemaining}
                hasUserBetThisRound={hasUserBetThisRound}
                isPending={isPending}
                isConnected={isConnected}
                onConnect={connect}
              />
            }
          />
          <Route path="rewards" element={<RewardsPage rewards={rewards} streak={streak} />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
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
        streak={streak}
        vaultAmount={rewards}
      />
    </>
  );
};

export default Index;

