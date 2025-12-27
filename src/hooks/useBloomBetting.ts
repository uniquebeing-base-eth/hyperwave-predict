import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserProvider, Contract, Interface, ethers } from "ethers";
import { sdk } from "@farcaster/miniapp-sdk";
import {
  BLOOM_BETTING_ABI,
  BLOOM_BETTING_ADDRESS,
  BLOOM_TOKEN_ADDRESS,
  Direction,
  ERC20_ABI,
  type Round,
  type UserStats,
} from "@/contracts/BloomBetting";
import { toast } from "@/hooks/use-toast";

const BASE_CHAIN_ID = 8453;
const BASE_CHAIN_ID_HEX = "0x2105";

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

interface UseBloomBettingReturn {
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

  connect: () => Promise<void>;
  placeBet: (direction: "up" | "down", amount: bigint) => Promise<boolean>;
  approveTokens: (amount: bigint) => Promise<boolean>;
  getAllowance: () => Promise<bigint>;
  refreshData: () => Promise<void>;
}

export function useBloomBetting(): UseBloomBettingReturn {
  const [ethProvider, setEthProvider] = useState<Eip1193Provider | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const [bloomBalance, setBloomBalance] = useState<bigint>(0n);
  const [bloomDecimals, setBloomDecimals] = useState(18);

  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [hasUserBetThisRound, setHasUserBetThisRound] = useState(false);
  const [isBettingOpen, setIsBettingOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [minimumStake, setMinimumStake] = useState<bigint>(0n);

  const [isLoading, setIsLoading] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const isConnectingRef = useRef(false);

  const tokenIface = useMemo(() => new Interface(ERC20_ABI as any), []);
  const bettingIface = useMemo(() => new Interface(BLOOM_BETTING_ABI as any), []);

  const getReadContracts = useCallback(
    (p: BrowserProvider) => {
      return {
        token: new Contract(BLOOM_TOKEN_ADDRESS, ERC20_ABI, p),
        betting: new Contract(BLOOM_BETTING_ADDRESS, BLOOM_BETTING_ABI, p),
      };
    },
    []
  );

  const ensureBase = useCallback(async (p: Eip1193Provider) => {
    try {
      const chainIdHex = (await p.request({ method: "eth_chainId" })) as string;
      const chainId = parseInt(chainIdHex, 16);
      if (chainId === BASE_CHAIN_ID) return;

      await p.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BASE_CHAIN_ID_HEX }],
      });
    } catch {
      // In Warpcast, chain switching may be managed by the wallet; failing here shouldn't block.
    }
  }, []);

  const resolveEthProvider = useCallback(async (): Promise<Eip1193Provider | null> => {
    try {
      const inMiniApp = await sdk.isInMiniApp();
      if (inMiniApp) {
        const p = (await sdk.wallet.getEthereumProvider()) as any;
        return (p ?? sdk.wallet.ethProvider) as any;
      }
    } catch {
      // ignore
    }

    if (typeof window !== "undefined" && (window as any).ethereum) {
      return (window as any).ethereum as any;
    }

    return null;
  }, []);

  const connect = useCallback(async () => {
    if (isConnectingRef.current) return;
    isConnectingRef.current = true;

    try {
      setIsLoading(true);

      const p = await resolveEthProvider();
      if (!p) {
        toast({
          title: "No wallet found",
          description: "Open this mini app in Warpcast to use the wallet.",
          variant: "destructive",
        });
        return;
      }

      setEthProvider(p);

      await ensureBase(p);

      const accounts = (await p.request({
        method: "eth_requestAccounts",
        params: [],
      })) as string[];

      const address = accounts?.[0];
      if (!address) {
        toast({
          title: "Connection failed",
          description: "No account returned by wallet.",
          variant: "destructive",
        });
        return;
      }

      const bp = new BrowserProvider(p as any);
      setProvider(bp);
      setUserAddress(address);
      setIsConnected(true);

      toast({
        title: "Wallet Connected",
        description: `${address.slice(0, 6)}...${address.slice(-4)}`,
      });
    } catch (e: any) {
      toast({
        title: "Connection failed",
        description: e?.message ?? "Failed to connect",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      isConnectingRef.current = false;
    }
  }, [ensureBase, resolveEthProvider]);

  const sendTx = useCallback(
    async (params: { to: string; data: string; value?: string }) => {
      if (!ethProvider || !userAddress) throw new Error("Wallet not connected");

      // This is the *Farcaster-native* flow: the wallet handles gas/estimation/UI.
      const txHash = (await ethProvider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: userAddress,
            to: params.to,
            data: params.data,
            value: params.value ?? "0x0",
          },
        ],
      })) as string;

      return txHash;
    },
    [ethProvider, userAddress]
  );

  const refreshData = useCallback(async () => {
    if (!provider || !userAddress) return;

    try {
      const { token, betting } = getReadContracts(provider);

      const decimals = (await token.decimals().catch(() => 18)) as number;
      setBloomDecimals(decimals);

      const [balance, round, stats, hasBet, bettingOpen, remaining, minStake] = await Promise.all([
        token.balanceOf(userAddress),
        betting.getCurrentRound().catch(() => null),
        betting.getUserStats(userAddress).catch(() => null),
        betting.hasUserBetThisRound(userAddress).catch(() => false),
        betting.isBettingOpen().catch(() => false),
        betting.getTimeRemaining().catch(() => 0n),
        betting.minimumStake().catch(() => 0n),
      ]);

      setBloomBalance(balance);
      setHasUserBetThisRound(Boolean(hasBet));
      setIsBettingOpen(Boolean(bettingOpen));
      setTimeRemaining(Number(remaining));
      setMinimumStake(minStake);

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
          resolved: round.resolved,
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
          lastPlayedDay: stats.lastPlayedDay,
        });
      }
    } catch (e) {
      console.error("refreshData failed", e);
    }
  }, [getReadContracts, provider, userAddress]);

  const getAllowance = useCallback(async (): Promise<bigint> => {
    if (!provider || !userAddress) return 0n;
    const { token } = getReadContracts(provider);
    return token.allowance(userAddress, BLOOM_BETTING_ADDRESS).catch(() => 0n);
  }, [getReadContracts, provider, userAddress]);

  const approveTokens = useCallback(
    async (_amount: bigint): Promise<boolean> => {
      if (!provider || !userAddress) {
        toast({ title: "Not connected", description: "Connect wallet first", variant: "destructive" });
        return false;
      }

      try {
        setIsPending(true);

        const data = tokenIface.encodeFunctionData("approve", [
          BLOOM_BETTING_ADDRESS,
          ethers.MaxUint256,
        ]);

        toast({ title: "Approve BLOOM", description: "Confirm in Warpcast wallet" });

        const hash = await sendTx({ to: BLOOM_TOKEN_ADDRESS, data });

        toast({ title: "Approval sent", description: `${hash.slice(0, 10)}...` });

        await provider.waitForTransaction(hash);
        await refreshData();
        return true;
      } catch (e: any) {
        toast({
          title: "Approval failed",
          description: e?.shortMessage ?? e?.message ?? "Approval failed",
          variant: "destructive",
        });
        return false;
      } finally {
        setIsPending(false);
      }
    },
    [provider, refreshData, sendTx, tokenIface, userAddress]
  );

  const placeBet = useCallback(
    async (direction: "up" | "down", amount: bigint): Promise<boolean> => {
      if (!provider || !userAddress) {
        toast({ title: "Not connected", description: "Connect wallet first", variant: "destructive" });
        return false;
      }

      try {
        setIsPending(true);

        const { token } = getReadContracts(provider);

        const [balance, allowance] = await Promise.all([
          token.balanceOf(userAddress).catch(() => 0n),
          getAllowance(),
        ]);

        if (balance < amount) {
          const bal = ethers.formatUnits(balance, bloomDecimals);
          const need = ethers.formatUnits(amount, bloomDecimals);
          toast({
            title: "Insufficient BLOOM",
            description: `Have ${Number(bal).toLocaleString()} but need ${Number(need).toLocaleString()}`,
            variant: "destructive",
          });
          return false;
        }

        if (allowance < amount) {
          const ok = await approveTokens(amount);
          if (!ok) return false;
        }

        const dirEnum = direction === "up" ? Direction.Up : Direction.Down;
        const data = bettingIface.encodeFunctionData("placeBet", [dirEnum, amount]);

        toast({ title: "Place bet", description: "Confirm in Warpcast wallet" });

        const hash = await sendTx({ to: BLOOM_BETTING_ADDRESS, data });
        toast({ title: "Bet sent", description: `${hash.slice(0, 10)}...` });

        await provider.waitForTransaction(hash);
        await refreshData();
        return true;
      } catch (e: any) {
        toast({
          title: "Bet failed",
          description: e?.shortMessage ?? e?.message ?? "Bet failed",
          variant: "destructive",
        });
        return false;
      } finally {
        setIsPending(false);
      }
    },
    [approveTokens, bettingIface, bloomDecimals, getAllowance, getReadContracts, provider, refreshData, sendTx, userAddress]
  );

  // Keep data fresh when connected
  useEffect(() => {
    if (!isConnected) return;
    refreshData();
    const t = setInterval(refreshData, 10000);
    return () => clearInterval(t);
  }, [isConnected, refreshData]);

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
    refreshData,
  };
}
