import { useState, useEffect, useCallback } from 'react';
import { ethers, BrowserProvider, Contract } from 'ethers';
import { 
  BLOOM_BETTING_ADDRESS, 
  BLOOM_TOKEN_ADDRESS, 
  BLOOM_BETTING_ABI, 
  ERC20_ABI,
  Direction,
  type Round,
  type UserStats,
  type Bet
} from '@/contracts/BloomBetting';
import { toast } from '@/hooks/use-toast';

interface UseBloomBettingReturn {
  // State
  isConnected: boolean;
  userAddress: string | null;
  bloomBalance: bigint;
  currentRound: Round | null;
  userStats: UserStats | null;
  hasUserBetThisRound: boolean;
  isBettingOpen: boolean;
  timeRemaining: number;
  minimumStake: bigint;
  isLoading: boolean;
  isPending: boolean;
  
  // Actions
  connect: () => Promise<void>;
  placeBet: (direction: 'up' | 'down', amount: bigint) => Promise<boolean>;
  approveTokens: (amount: bigint) => Promise<boolean>;
  getAllowance: () => Promise<bigint>;
  refreshData: () => Promise<void>;
}

export function useBloomBetting(): UseBloomBettingReturn {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [bloomBalance, setBloomBalance] = useState<bigint>(0n);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [hasUserBetThisRound, setHasUserBetThisRound] = useState(false);
  const [isBettingOpen, setIsBettingOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [minimumStake, setMinimumStake] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const getContracts = useCallback(() => {
    if (!signer) return null;
    
    const bettingContract = new Contract(BLOOM_BETTING_ADDRESS, BLOOM_BETTING_ABI, signer);
    const tokenContract = new Contract(BLOOM_TOKEN_ADDRESS, ERC20_ABI, signer);
    
    return { bettingContract, tokenContract };
  }, [signer]);

  const connect = useCallback(async () => {
    try {
      setIsLoading(true);
      
      if (!window.ethereum) {
        toast({ title: "No wallet found", description: "Please install a Web3 wallet", variant: "destructive" });
        return;
      }

      const browserProvider = new BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send("eth_requestAccounts", []);
      const userSigner = await browserProvider.getSigner();
      
      setProvider(browserProvider);
      setSigner(userSigner);
      setUserAddress(accounts[0]);
      setIsConnected(true);
      
      toast({ title: "Connected", description: `Wallet connected: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}` });
    } catch (error: any) {
      console.error("Connection error:", error);
      toast({ title: "Connection failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshData = useCallback(async () => {
    const contracts = getContracts();
    if (!contracts || !userAddress) return;

    try {
      const { bettingContract, tokenContract } = contracts;
      
      const [balance, round, stats, hasBet, bettingOpen, remaining, minStake] = await Promise.all([
        tokenContract.balanceOf(userAddress),
        bettingContract.getCurrentRound(),
        bettingContract.getUserStats(userAddress),
        bettingContract.hasUserBetThisRound(userAddress),
        bettingContract.isBettingOpen(),
        bettingContract.getTimeRemaining(),
        bettingContract.minimumStake()
      ]);

      setBloomBalance(balance);
      setCurrentRound({
        roundId: round.roundId,
        startTime: round.startTime,
        endTime: round.endTime,
        startPrice: round.startPrice,
        endPrice: round.endPrice,
        totalUpPool: round.totalUpPool,
        totalDownPool: round.totalDownPool,
        result: round.result,
        resolved: round.resolved
      });
      setUserStats({
        totalBets: stats.totalBets,
        totalWins: stats.totalWins,
        totalLosses: stats.totalLosses,
        totalStaked: stats.totalStaked,
        totalProfits: stats.totalProfits,
        currentStreak: stats.currentStreak,
        lastPlayedDay: stats.lastPlayedDay
      });
      setHasUserBetThisRound(hasBet);
      setIsBettingOpen(bettingOpen);
      setTimeRemaining(Number(remaining));
      setMinimumStake(minStake);
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  }, [getContracts, userAddress]);

  const getAllowance = useCallback(async (): Promise<bigint> => {
    const contracts = getContracts();
    if (!contracts || !userAddress) return 0n;
    
    try {
      const allowance = await contracts.tokenContract.allowance(userAddress, BLOOM_BETTING_ADDRESS);
      return allowance;
    } catch (error) {
      console.error("Error getting allowance:", error);
      return 0n;
    }
  }, [getContracts, userAddress]);

  const approveTokens = useCallback(async (amount: bigint): Promise<boolean> => {
    const contracts = getContracts();
    if (!contracts) return false;

    try {
      setIsPending(true);
      const tx = await contracts.tokenContract.approve(BLOOM_BETTING_ADDRESS, amount);
      toast({ title: "Approving tokens...", description: "Please wait for confirmation" });
      await tx.wait();
      toast({ title: "Tokens approved", description: "You can now place your bet" });
      return true;
    } catch (error: any) {
      console.error("Approval error:", error);
      toast({ title: "Approval failed", description: error.reason || error.message, variant: "destructive" });
      return false;
    } finally {
      setIsPending(false);
    }
  }, [getContracts]);

  const placeBet = useCallback(async (direction: 'up' | 'down', amount: bigint): Promise<boolean> => {
    const contracts = getContracts();
    if (!contracts || !userAddress) {
      toast({ title: "Not connected", description: "Please connect your wallet first", variant: "destructive" });
      return false;
    }

    try {
      setIsPending(true);

      // Check allowance first
      const allowance = await getAllowance();
      if (allowance < amount) {
        const approved = await approveTokens(amount);
        if (!approved) return false;
      }

      const directionEnum = direction === 'up' ? Direction.Up : Direction.Down;
      const tx = await contracts.bettingContract.placeBet(directionEnum, amount);
      
      toast({ title: "Placing bet...", description: "Please wait for confirmation" });
      await tx.wait();
      
      toast({ title: "Bet placed!", description: `You bet ${ethers.formatEther(amount)} BLOOM on ${direction.toUpperCase()}` });
      
      await refreshData();
      return true;
    } catch (error: any) {
      console.error("Bet error:", error);
      const message = error.reason || error.message || "Transaction failed";
      toast({ title: "Bet failed", description: message, variant: "destructive" });
      return false;
    } finally {
      setIsPending(false);
    }
  }, [getContracts, userAddress, getAllowance, approveTokens, refreshData]);

  // Auto-connect if wallet was previously connected
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const browserProvider = new BrowserProvider(window.ethereum);
          const accounts = await browserProvider.listAccounts();
          if (accounts.length > 0) {
            const userSigner = await browserProvider.getSigner();
            setProvider(browserProvider);
            setSigner(userSigner);
            setUserAddress(await userSigner.getAddress());
            setIsConnected(true);
          }
        } catch (error) {
          console.error("Auto-connect check failed:", error);
        }
      }
    };
    checkConnection();
  }, []);

  // Refresh data when connected
  useEffect(() => {
    if (isConnected && userAddress) {
      refreshData();
      const interval = setInterval(refreshData, 5000);
      return () => clearInterval(interval);
    }
  }, [isConnected, userAddress, refreshData]);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          setIsConnected(false);
          setUserAddress(null);
          setSigner(null);
        } else {
          setUserAddress(accounts[0]);
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      return () => window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
    }
  }, []);

  return {
    isConnected,
    userAddress,
    bloomBalance,
    currentRound,
    userStats,
    hasUserBetThisRound,
    isBettingOpen,
    timeRemaining,
    minimumStake,
    isLoading,
    isPending,
    connect,
    placeBet,
    approveTokens,
    getAllowance,
    refreshData
  };
}
