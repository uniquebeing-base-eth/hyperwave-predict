


import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers, BrowserProvider, Contract, JsonRpcSigner } from 'ethers';
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

// Base Mainnet chain ID
const BASE_CHAIN_ID = 8453;
const BASE_CHAIN_ID_HEX = '0x2105';

interface UseBloomBettingReturn {
  // State
  isConnected: boolean;
  userAddress: string | null;
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
  connect: () => Promise<void>;
  placeBet: (direction: 'up' | 'down', amount: bigint) => Promise<boolean>;
  approveTokens: (amount: bigint) => Promise<boolean>;
  getAllowance: () => Promise<bigint>;
  refreshData: () => Promise<void>;
}

export function useBloomBetting(): UseBloomBettingReturn {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [bloomBalance, setBloomBalance] = useState<bigint>(0n);
  const [bloomDecimals, setBloomDecimals] = useState<number>(18);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [hasUserBetThisRound, setHasUserBetThisRound] = useState(false);
  const [isBettingOpen, setIsBettingOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [minimumStake, setMinimumStake] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, setIsPending] = useState(false);
  
  const isConnecting = useRef(false);
  const hasInitialized = useRef(false);
  const ethProviderRef = useRef<any>(null);

  const getContracts = useCallback((signerOrProvider: JsonRpcSigner | BrowserProvider) => {
    const bettingContract = new Contract(BLOOM_BETTING_ADDRESS, BLOOM_BETTING_ABI, signerOrProvider);
    const tokenContract = new Contract(BLOOM_TOKEN_ADDRESS, ERC20_ABI, signerOrProvider);
    
    return { bettingContract, tokenContract };
  }, []);

  const connect = useCallback(async () => {
    if (isConnecting.current) return;
    isConnecting.current = true;
    
    try {
      setIsLoading(true);
      
      let ethProvider: any = null;
      
      // Check if we're in Farcaster mini app
      try {
        const inMiniApp = await sdk.isInMiniApp();
        console.log('Is in Mini App:', inMiniApp);
        
        if (inMiniApp) {
          // Get the Farcaster ethProvider directly from sdk.wallet
          ethProvider = sdk.wallet.ethProvider;
          console.log('Got Farcaster ethProvider:', !!ethProvider);
        }
      } catch (e) {
        console.log('Farcaster SDK check failed:', e);
      }
      
      // Fallback to window.ethereum
      if (!ethProvider && typeof window !== 'undefined' && window.ethereum) {
        ethProvider = window.ethereum;
        console.log('Using window.ethereum');
      }
      
      if (!ethProvider) {
        toast({ 
          title: "No wallet found", 
          description: "Please open this app in Warpcast", 
          variant: "destructive" 
        });
        return;
      }

      // Store the provider for later use
      ethProviderRef.current = ethProvider;

      // Request accounts - this triggers the Farcaster wallet connection
      console.log('Requesting eth_requestAccounts...');
      let accounts: string[];
      
      try {
        accounts = await ethProvider.request({ 
          method: 'eth_requestAccounts',
          params: []
        }) as string[];
        console.log('Accounts received:', accounts);
      } catch (reqError: any) {
        console.error('Request accounts error:', reqError);
        toast({ 
          title: "Connection rejected", 
          description: "Please approve the connection request", 
          variant: "destructive" 
        });
        return;
      }
      
      if (!accounts || accounts.length === 0) {
        toast({ 
          title: "No accounts", 
          description: "No accounts found in wallet", 
          variant: "destructive" 
        });
        return;
      }

      // Check current chain
      const chainIdHex = await ethProvider.request({ method: 'eth_chainId' });
      const chainId = parseInt(chainIdHex as string, 16);
      console.log('Current chain ID:', chainId);
      
      // Switch to Base if needed
      if (chainId !== BASE_CHAIN_ID) {
        console.log('Switching to Base...');
        try {
          await ethProvider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: BASE_CHAIN_ID_HEX }],
          });
          console.log('Switched to Base');
        } catch (switchError: any) {
          console.error('Chain switch error:', switchError);
          // In Farcaster, if the chain switch fails, we might still be able to continue
          // as Farcaster handles multi-chain
        }
      }

      // Create provider and signer using ethers
      const browserProvider = new BrowserProvider(ethProvider);
      const userSigner = await browserProvider.getSigner();
      const address = await userSigner.getAddress();
      
      console.log('Connected address:', address);
      
      setProvider(browserProvider);
      setSigner(userSigner);
      setUserAddress(address);
      setIsConnected(true);
      
      toast({ 
        title: "Wallet Connected", 
        description: `${address.slice(0, 6)}...${address.slice(-4)}` 
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
      isConnecting.current = false;
    }
  }, []);

  const refreshData = useCallback(async () => {
    if (!signer || !userAddress) {
      console.log('Cannot refresh: no signer or address');
      return;
    }

    try {
      const contracts = getContracts(signer);
      const { bettingContract, tokenContract } = contracts;
      
      // Get token decimals first
      let decimals = 18;
      try {
        decimals = await tokenContract.decimals();
        setBloomDecimals(decimals);
      } catch (e) {
        console.log('Could not get decimals, using 18');
      }
      
      // Fetch all data in parallel
      const [balance, round, stats, hasBet, bettingOpen, remaining, minStake] = await Promise.all([
        tokenContract.balanceOf(userAddress),
        bettingContract.getCurrentRound().catch(() => null),
        bettingContract.getUserStats(userAddress).catch(() => null),
        bettingContract.hasUserBetThisRound(userAddress).catch(() => false),
        bettingContract.isBettingOpen().catch(() => false),
        bettingContract.getTimeRemaining().catch(() => 0n),
        bettingContract.minimumStake().catch(() => 0n)
      ]);

      console.log('BLOOM Balance (raw):', balance.toString());
      console.log('BLOOM Balance (formatted):', ethers.formatUnits(balance, decimals));
      
      setBloomBalance(balance);
      
      if (round) {
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
      }
      
      if (stats) {
        setUserStats({
          totalBets: stats.totalBets,
          totalWins: stats.totalWins,
          totalLosses: stats.totalLosses,
          totalStaked: stats.totalStaked,
          totalProfits: stats.totalProfits,
          currentStreak: stats.currentStreak,
          lastPlayedDay: stats.lastPlayedDay
        });
      }
      
      setHasUserBetThisRound(hasBet);
      setIsBettingOpen(bettingOpen);
      setTimeRemaining(Number(remaining));
      setMinimumStake(minStake);
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  }, [getContracts, signer, userAddress]);

  const getAllowance = useCallback(async (): Promise<bigint> => {
    if (!signer || !userAddress) return 0n;
    
    try {
      const { tokenContract } = getContracts(signer);
      const allowance = await tokenContract.allowance(userAddress, BLOOM_BETTING_ADDRESS);
      console.log('Current allowance:', allowance.toString());
      return allowance;
    } catch (error) {
      console.error("Error getting allowance:", error);
      return 0n;
    }
  }, [getContracts, signer, userAddress]);

  const approveTokens = useCallback(async (amount: bigint): Promise<boolean> => {
    if (!signer) return false;

    try {
      setIsPending(true);
      toast({ title: "Approving BLOOM...", description: "Please confirm in your wallet" });
      
      const { tokenContract } = getContracts(signer);
      
      // Approve max amount to avoid repeated approvals
      const maxApproval = ethers.MaxUint256;
      
      console.log('Sending approve transaction...');
      const tx = await tokenContract.approve(BLOOM_BETTING_ADDRESS, maxApproval);
      console.log('Approval tx hash:', tx.hash);
      
      toast({ title: "Transaction Sent", description: "Waiting for confirmation..." });
      
      const receipt = await tx.wait();
      console.log('Approval confirmed:', receipt);
      
      toast({ title: "Approved!", description: "You can now place your bet" });
      return true;
    } catch (error: any) {
      console.error("Approval error:", error);
      const msg = error.reason || error.shortMessage || error.message || "Transaction rejected";
      toast({ 
        title: "Approval failed", 
        description: msg, 
        variant: "destructive" 
      });
      return false;
    } finally {
      setIsPending(false);
    }
  }, [getContracts, signer]);

  const placeBet = useCallback(async (direction: 'up' | 'down', amount: bigint): Promise<boolean> => {
    if (!signer || !userAddress) {
      toast({ 
        title: "Not connected", 
        description: "Please connect your wallet first", 
        variant: "destructive" 
      });
      return false;
    }

    try {
      setIsPending(true);
      
      const { tokenContract, bettingContract } = getContracts(signer);
      
      // Check balance
      const balance = await tokenContract.balanceOf(userAddress);
      console.log('Balance check:', balance.toString(), 'vs bet:', amount.toString());
      
      if (balance < amount) {
        const balanceFormatted = ethers.formatUnits(balance, bloomDecimals);
        const amountFormatted = ethers.formatUnits(amount, bloomDecimals);
        toast({ 
          title: "Insufficient Balance", 
          description: `You have ${Number(balanceFormatted).toLocaleString()} BLOOM but need ${Number(amountFormatted).toLocaleString()}`, 
          variant: "destructive" 
        });
        return false;
      }

      // Check allowance
      const allowance = await getAllowance();
      console.log('Allowance check:', allowance.toString(), 'vs bet:', amount.toString());
      
      if (allowance < amount) {
        toast({ title: "Approval needed", description: "Approving BLOOM tokens..." });
        const approved = await approveTokens(amount);
        if (!approved) return false;
      }

      const directionEnum = direction === 'up' ? Direction.Up : Direction.Down;
      
      toast({ title: "Placing bet...", description: "Please confirm in your wallet" });
      
      console.log('Calling placeBet:', directionEnum, amount.toString());
      const tx = await bettingContract.placeBet(directionEnum, amount);
      console.log('Bet tx hash:', tx.hash);
      
      toast({ title: "Transaction Sent", description: "Waiting for confirmation..." });
      
      const receipt = await tx.wait();
      console.log('Bet confirmed:', receipt);
      
      const amountFormatted = ethers.formatUnits(amount, bloomDecimals);
      toast({ 
        title: "Bet Placed!", 
        description: `${Number(amountFormatted).toLocaleString()} BLOOM on ${direction.toUpperCase()}` 
      });
      
      await refreshData();
      return true;
    } catch (error: any) {
      console.error("Bet error:", error);
      const msg = error.reason || error.shortMessage || error.message || "Transaction failed";
      toast({ 
        title: "Bet failed", 
        description: msg, 
        variant: "destructive" 
      });
      return false;
    } finally {
      setIsPending(false);
    }
  }, [getContracts, signer, userAddress, bloomDecimals, getAllowance, approveTokens, refreshData]);

  // Auto-connect on mount for Farcaster
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    
    const autoConnect = async () => {
      try {
        const inMiniApp = await sdk.isInMiniApp();
        console.log('Auto-connect check - in Mini App:', inMiniApp);
        
        if (inMiniApp) {
          // Small delay to ensure SDK is fully ready
          await new Promise(resolve => setTimeout(resolve, 500));
          await connect();
        }
      } catch (error) {
        console.log("Auto-connect check failed:", error);
      }
    };
    
    autoConnect();
  }, [connect]);

  // Refresh data when connected
  useEffect(() => {
    if (isConnected && userAddress && signer) {
      refreshData();
      const interval = setInterval(refreshData, 10000);
      return () => clearInterval(interval);
    }
  }, [isConnected, userAddress, signer, refreshData]);

  return {
    isConnected,
    userAddress,
    bloomBalance,
    bloomDecimals,
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
