import { useAccount, useConnect, useDisconnect, useReadContract, useSendCalls } from 'wagmi';
import { useState, useEffect, useCallback } from 'react';
import { encodeFunctionData, formatUnits, maxUint256 } from 'viem';
import { base } from 'wagmi/chains';
import { waitForCallsStatus } from '@wagmi/core';
import {
  wagmiConfig,
  BLOOM_BETTING_ADDRESS,
  BLOOM_TOKEN_ADDRESS,
  BLOOM_BETTING_ABI,
  ERC20_ABI,
  Direction,
  type Round,
  type UserStats,
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
  const sendCalls = useSendCalls();

  const [isApproving, setIsApproving] = useState(false);
  const [isBetting, setIsBetting] = useState(false);
  const [isAwaitingConfirmation, setIsAwaitingConfirmation] = useState(false);

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

  // Approve tokens
  const approveTokens = useCallback(async (_amount: bigint): Promise<boolean> => {
    if (!address) return false;

    try {
      setIsApproving(true);
      toast({ title: 'Approving BLOOM...', description: 'Confirm in your wallet' });

      const approveData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [BLOOM_BETTING_ADDRESS, maxUint256],
      });

      const { id } = await sendCalls.mutateAsync({
        calls: [{ to: BLOOM_TOKEN_ADDRESS, data: approveData }],
      });

      toast({ title: 'Transaction Sent', description: 'Waiting for confirmation...' });
      setIsAwaitingConfirmation(true);
      await waitForCallsStatus(wagmiConfig, { id, timeout: 60_000 });

      await refetchAllowance();
      toast({ title: 'Approved!', description: 'You can now place your bet' });
      return true;
    } catch (error: any) {
      console.error('Approval error:', error);
      toast({
        title: 'Approval failed',
        description: error.shortMessage || error.message || 'Transaction rejected',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsApproving(false);
      setIsAwaitingConfirmation(false);
    }
  }, [address, sendCalls, refetchAllowance]);

  const placeBet = useCallback(async (direction: 'up' | 'down', amount: bigint): Promise<boolean> => {
    if (!address) {
      toast({
        title: 'Not connected',
        description: 'Please connect your wallet first',
        variant: 'destructive',
      });
      return false;
    }

    try {
      setIsBetting(true);

      // Contract-side prechecks (avoid opaque errors)
      if (!(isBettingOpenData ?? false)) {
        toast({
          title: 'Betting closed',
          description: 'Wait for the next round to start.',
          variant: 'destructive',
        });
        return false;
      }

      if (hasBetData ?? false) {
        toast({
          title: 'Already bet this round',
          description: 'You can only place one bet per round.',
          variant: 'destructive',
        });
        return false;
      }

      const minStake = minStakeData ?? 0n;
      if (minStake > 0n && amount < minStake) {
        toast({
          title: 'Stake too low',
          description: `Minimum stake is ${Number(formatUnits(minStake, bloomDecimals)).toLocaleString()} BLOOM.`,
          variant: 'destructive',
        });
        return false;
      }

      if (bloomBalance < amount) {
        const balanceFormatted = formatUnits(bloomBalance, bloomDecimals);
        const amountFormatted = formatUnits(amount, bloomDecimals);
        toast({
          title: 'Insufficient Balance',
          description: `You have ${Number(balanceFormatted).toLocaleString()} BLOOM but need ${Number(amountFormatted).toLocaleString()}`,
          variant: 'destructive',
        });
        return false;
      }

      const directionEnum = direction === 'up' ? Direction.Up : Direction.Down;

      const approveData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [BLOOM_BETTING_ADDRESS, maxUint256],
      });

      const betData = encodeFunctionData({
        abi: BLOOM_BETTING_ABI,
        functionName: 'placeBet',
        args: [directionEnum, amount],
      });

      const calls = allowance < amount
        ? [
            { to: BLOOM_TOKEN_ADDRESS, data: approveData },
            { to: BLOOM_BETTING_ADDRESS, data: betData },
          ]
        : [{ to: BLOOM_BETTING_ADDRESS, data: betData }];

      toast({ title: 'Confirm transaction...', description: 'Confirm in your wallet' });

      const { id } = await sendCalls.mutateAsync({ calls });

      toast({ title: 'Transaction Sent', description: 'Waiting for confirmation...' });
      setIsAwaitingConfirmation(true);
      await waitForCallsStatus(wagmiConfig, { id, timeout: 60_000 });

      toast({
        title: 'Bet Placed!',
        description: `${Number(formatUnits(amount, bloomDecimals)).toLocaleString()} BLOOM on ${direction.toUpperCase()}`,
      });

      refreshData();
      return true;
    } catch (error: any) {
      console.error('Bet error:', error);
      toast({
        title: 'Bet failed',
        description: error.shortMessage || error.message || 'Transaction failed',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsBetting(false);
      setIsAwaitingConfirmation(false);
    }
  }, [
    address,
    bloomBalance,
    bloomDecimals,
    allowance,
    sendCalls,
    isBettingOpenData,
    hasBetData,
    minStakeData,
    refreshData,
  ]);


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
    isLoading: isAwaitingConfirmation,
    isPending: sendCalls.isPending || isApproving || isBetting || isAwaitingConfirmation,
    connect: handleConnect,
    disconnect,
    placeBet,
    approveTokens,
    allowance,
    refreshData,
  };
}
