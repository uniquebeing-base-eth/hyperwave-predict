import { useState, useEffect, useCallback } from 'react';
import { ethers, BrowserProvider, Contract } from 'ethers';
import { sdk } from '@farcaster/miniapp-sdk';
import { 
  BLOOM_BETTING_ADDRESS, 
  BLOOM_TOKEN_ADDRESS, 
  BLOOM_BETTING_ABI, 
  ERC20_ABI,
  Direction,
  type Round,
  type UserStats
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
      
      // Try Farcaster provider first (for mini apps)
      let ethProvider: any = null;
      
      try {
        // Check if we're in a Farcaster mini app
        const isInMiniApp = await sdk.isInMiniApp();
        
        if (isInMiniApp) {
          // Use Farcaster's ethProvider
          ethProvider = sdk.wallet.ethProvider;
          console.log('Using Farcaster ethProvider');
        }
      } catch (e) {
        console.log('Not in Farcaster mini app, falling back to window.ethereum');
      }
      
      // Fallback to window.ethereum if not in mini app
      if (!ethProvider && window.ethereum) {
        ethProvider = window.ethereum;
        console.log('Using window.ethereum');
      }
      
      if (!ethProvider) {
        toast({ 
          title: "No wallet found", 
          description: "Please open this app in Warpcast or install a Web3 wallet", 
          variant: "destructive" 
        });
        return;
      }

      const browserProvider = new BrowserProvider(ethProvider);
      
      // Request accounts
      const accounts = await browserProvider.send("eth_requestAccounts", []);
      
      if (!accounts || accounts.length === 0) {
        toast({ 
          title: "Connection failed", 
          description: "No accounts found", 
          variant: "destructive" 
        });
        return;
      }
      
      const userSigner = await browserProvider.getSigner();
      
      setProvider(browserProvider);
      setSigner(userSigner);
      setUserAddress(accounts[0]);
      setIsConnected(true);
      
      toast({ 
        title: "Wallet Connected", 
        description: `${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}` 
      });
    } catch (error: any) {
      console.error("Connection error:", error);
      toast({ 
        title: "Connection failed", 
        description: error.message || "Failed to connect wallet", 
        variant: "destructive" 
      });
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
      toast({ title: "Approving BLOOM...", description: "Please confirm in your wallet" });
      
      const tx = await contracts.tokenContract.approve(BLOOM_BETTING_ADDRESS, amount);
      await tx.wait();
      
      toast({ title: "Approved!", description: "You can now place your bet" });
      return true;
    } catch (error: any) {
      console.error("Approval error:", error);
      toast({ 
        title: "Approval failed", 
        description: error.reason || error.message || "Transaction rejected", 
        variant: "destructive" 
      });
      return false;
    } finally {
      setIsPending(false);
    }
  }, [getContracts]);

  const placeBet = useCallback(async (direction: 'up' | 'down', amount: bigint): Promise<boolean> => {
    const contracts = getContracts();
    if (!contracts || !userAddress) {
      toast({ 
        title: "Not connected", 
        description: "Please connect your wallet first", 
        variant: "destructive" 
      });
      return false;
    }

    try {
      setIsPending(true);

      // Check allowance first
      const allowance = await getAllowance();
      if (allowance < amount) {
        toast({ title: "Approval needed", description: "Approving BLOOM tokens..." });
        const approved = await approveTokens(amount);
        if (!approved) return false;
      }

      const directionEnum = direction === 'up' ? Direction.Up : Direction.Down;
      
      toast({ title: "Placing bet...", description: "Please confirm in your wallet" });
      
      const tx = await contracts.bettingContract.placeBet(directionEnum, amount);
      await tx.wait();
      
      toast({ 
        title: "Bet placed!", 
        description: `${ethers.formatEther(amount)} BLOOM on ${direction.toUpperCase()}` 
      });
      
      await refreshData();
      return true;
    } catch (error: any) {
      console.error("Bet error:", error);
      const message = error.reason || error.message || "Transaction failed";
      toast({ 
        title: "Bet failed", 
        description: message, 
        variant: "destructive" 
      });
      return false;
    } finally {
      setIsPending(false);
    }
  }, [getContracts, userAddress, getAllowance, approveTokens, refreshData]);

  // Auto-connect on mount
  useEffect(() => {
    const autoConnect = async () => {
      try {
        // Check if in Farcaster mini app
        const isInMiniApp = await sdk.isInMiniApp();
        
        if (isInMiniApp) {
          // Auto-connect in Farcaster
          await connect();
        } else if (window.ethereum) {
          // Check if already connected
          const browserProvider = new BrowserProvider(window.ethereum);
          const accounts = await browserProvider.listAccounts();
          if (accounts.length > 0) {
            const userSigner = await browserProvider.getSigner();
            setProvider(browserProvider);
            setSigner(userSigner);
            setUserAddress(await userSigner.getAddress());
            setIsConnected(true);
          }
        }
      } catch (error) {
        console.log("Auto-connect failed:", error);
      }
    };
    
    autoConnect();
  }, [connect]);

  // Refresh data when connected
  useEffect(() => {
    if (isConnected && userAddress) {
      refreshData();
      const interval = setInterval(refreshData, 5000);
      return () => clearInterval(interval);
    }
  }, [isConnected, userAddress, refreshData]);

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
