import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useState, useEffect, useCallback } from 'react';
import { formatUnits, maxUint256 } from 'viem';
import { base } from 'wagmi/chains';
import { 
  BLOOM_BETTING_ADDRESS, 
  BLOOM_TOKEN_ADDRESS, 
  BLOOM_BETTING_ABI, 
  ERC20_ABI,
  Direction,
  type Round,
  type UserStats
} from '@/lib/wagmiConfig';
import { toast } from '@/hooks/use-toast';

interface UseWagmiBettingReturn {
  // State
  isConnected: boolean;
  userAddress: string | undefined;
  bloomBalance: bigint;
  bloomDecimals: number;
  currentRound: Round | null;
  userStats: UserStats | null;
  hasUserBetThisRound: boolean;
  isBettingOpen: boolean;
  timeRemaining: number;
  minimumStake: bigint;
  isLoading: boolean;
  isPending: boolean;
  
  // Actions
  connect: () => void;
  disconnect: () => void;
  placeBet: (direction: 'up' | 'down', amount: bigint) => Promise<boolean>;
  approveTokens: (amount: bigint) => Promise<boolean>;
  allowance: bigint;
  refreshData: () => void;
}

export function useWagmiBetting(): UseWagmiBettingReturn {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();
  
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | undefined>();
  const [isApproving, setIsApproving] = useState(false);
  const [isBetting, setIsBetting] = useState(false);

  // Wait for transaction
  const { isLoading: isTxLoading } = useWaitForTransactionReceipt({
    hash: pendingTxHash,
  });

  // Read token decimals
  const { data: decimalsData } = useReadContract({
    address: BLOOM_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'decimals',
  });
  const bloomDecimals = decimalsData ?? 18;

  // Read token balance
  const { data: balanceData, refetch: refetchBalance } = useReadContract({
    address: BLOOM_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const bloomBalance = balanceData ?? 0n;

  // Read allowance
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: BLOOM_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, BLOOM_BETTING_ADDRESS] : undefined,
    query: { enabled: !!address },
  });
  const allowance = allowanceData ?? 0n;

  // Read current round
  const { data: roundData, refetch: refetchRound } = useReadContract({
    address: BLOOM_BETTING_ADDRESS,
    abi: BLOOM_BETTING_ABI,
    functionName: 'getCurrentRound',
  });

  // Read user stats
  const { data: statsData, refetch: refetchStats } = useReadContract({
    address: BLOOM_BETTING_ADDRESS,
    abi: BLOOM_BETTING_ABI,
    functionName: 'getUserStats',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Read has user bet this round
  const { data: hasBetData, refetch: refetchHasBet } = useReadContract({
    address: BLOOM_BETTING_ADDRESS,
    abi: BLOOM_BETTING_ABI,
    functionName: 'hasUserBetThisRound',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Read is betting open
  const { data: isBettingOpenData, refetch: refetchBettingOpen } = useReadContract({
    address: BLOOM_BETTING_ADDRESS,
    abi: BLOOM_BETTING_ABI,
    functionName: 'isBettingOpen',
  });

  // Read time remaining
  const { data: timeRemainingData, refetch: refetchTime } = useReadContract({
    address: BLOOM_BETTING_ADDRESS,
    abi: BLOOM_BETTING_ABI,
    functionName: 'getTimeRemaining',
  });

  // Read minimum stake
  const { data: minStakeData } = useReadContract({
    address: BLOOM_BETTING_ADDRESS,
    abi: BLOOM_BETTING_ABI,
    functionName: 'minimumStake',
  });

  const currentRound: Round | null = roundData ? {
    roundId: roundData.roundId,
    startTime: roundData.startTime,
    endTime: roundData.endTime,
    startPrice: roundData.startPrice,
    endPrice: roundData.endPrice,
    totalUpPool: roundData.totalUpPool,
    totalDownPool: roundData.totalDownPool,
    result: roundData.result,
    resolved: roundData.resolved,
  } : null;

  const userStats: UserStats | null = statsData ? {
    totalBets: statsData.totalBets,
    totalWins: statsData.totalWins,
    totalLosses: statsData.totalLosses,
    totalStaked: statsData.totalStaked,
    totalProfits: statsData.totalProfits,
    currentStreak: statsData.currentStreak,
    lastPlayedDay: statsData.lastPlayedDay,
  } : null;

  // Connect handler
  const handleConnect = useCallback(() => {
    const connector = connectors[0]; // farcasterMiniApp connector
    if (connector) {
      connect({ connector });
    }
  }, [connect, connectors]);

  // Approve tokens
  const approveTokens = useCallback(async (amount: bigint): Promise<boolean> => {
    if (!address) return false;

    try {
      setIsApproving(true);
      toast({ title: "Approving BLOOM...", description: "Please confirm in your wallet" });

      const hash = await writeContractAsync({
        address: BLOOM_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [BLOOM_BETTING_ADDRESS, maxUint256],
        account: address,
        chain: base,
      });

      setPendingTxHash(hash);
      toast({ title: "Transaction Sent", description: "Waiting for confirmation..." });

      // Wait for confirmation
      await new Promise(resolve => setTimeout(resolve, 5000));
      await refetchAllowance();

      toast({ title: "Approved!", description: "You can now place your bet" });
      return true;
    } catch (error: any) {
      console.error("Approval error:", error);
      toast({ 
        title: "Approval failed", 
        description: error.shortMessage || error.message || "Transaction rejected", 
        variant: "destructive" 
      });
      return false;
    } finally {
      setIsApproving(false);
      setPendingTxHash(undefined);
    }
  }, [address, writeContractAsync, refetchAllowance]);

  // Place bet
  const placeBet = useCallback(async (direction: 'up' | 'down', amount: bigint): Promise<boolean> => {
    if (!address) {
      toast({ 
        title: "Not connected", 
        description: "Please connect your wallet first", 
        variant: "destructive" 
      });
      return false;
    }

    try {
      setIsBetting(true);

      // Check balance
      if (bloomBalance < amount) {
        const balanceFormatted = formatUnits(bloomBalance, bloomDecimals);
        const amountFormatted = formatUnits(amount, bloomDecimals);
        toast({ 
          title: "Insufficient Balance", 
          description: `You have ${Number(balanceFormatted).toLocaleString()} BLOOM but need ${Number(amountFormatted).toLocaleString()}`, 
          variant: "destructive" 
        });
        return false;
      }

      // Check allowance
      if (allowance < amount) {
        toast({ title: "Approval needed", description: "Approving BLOOM tokens..." });
        const approved = await approveTokens(amount);
        if (!approved) return false;
      }

      const directionEnum = direction === 'up' ? Direction.Up : Direction.Down;

      toast({ title: "Placing bet...", description: "Please confirm in your wallet" });

      const hash = await writeContractAsync({
        address: BLOOM_BETTING_ADDRESS,
        abi: BLOOM_BETTING_ABI,
        functionName: 'placeBet',
        args: [directionEnum, amount],
        account: address,
        chain: base,
      });

      setPendingTxHash(hash);
      toast({ title: "Transaction Sent", description: "Waiting for confirmation..." });

      // Wait for confirmation
      await new Promise(resolve => setTimeout(resolve, 5000));

      const amountFormatted = formatUnits(amount, bloomDecimals);
      toast({ 
        title: "Bet Placed!", 
        description: `${Number(amountFormatted).toLocaleString()} BLOOM on ${direction.toUpperCase()}` 
      });

      // Refresh data
      refreshData();
      return true;
    } catch (error: any) {
      console.error("Bet error:", error);
      toast({ 
        title: "Bet failed", 
        description: error.shortMessage || error.message || "Transaction failed", 
        variant: "destructive" 
      });
      return false;
    } finally {
      setIsBetting(false);
      setPendingTxHash(undefined);
    }
  }, [address, bloomBalance, bloomDecimals, allowance, approveTokens, writeContractAsync]);

  // Refresh all data
  const refreshData = useCallback(() => {
    refetchBalance();
    refetchAllowance();
    refetchRound();
    refetchStats();
    refetchHasBet();
    refetchBettingOpen();
    refetchTime();
  }, [refetchBalance, refetchAllowance, refetchRound, refetchStats, refetchHasBet, refetchBettingOpen, refetchTime]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (isConnected) {
      const interval = setInterval(refreshData, 10000);
      return () => clearInterval(interval);
    }
  }, [isConnected, refreshData]);

  // Auto-connect on mount
  useEffect(() => {
    if (!isConnected && connectors.length > 0) {
      // Small delay for SDK initialization
      const timeout = setTimeout(() => {
        handleConnect();
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [isConnected, connectors, handleConnect]);

  return {
    isConnected,
    userAddress: address,
    bloomBalance,
    bloomDecimals,
    currentRound,
    userStats,
    hasUserBetThisRound: hasBetData ?? false,
    isBettingOpen: isBettingOpenData ?? false,
    timeRemaining: Number(timeRemainingData ?? 0n),
    minimumStake: minStakeData ?? 0n,
    isLoading: isTxLoading,
    isPending: isWritePending || isApproving || isBetting,
    connect: handleConnect,
    disconnect,
    placeBet,
    approveTokens,
    allowance,
    refreshData,
  };
}
