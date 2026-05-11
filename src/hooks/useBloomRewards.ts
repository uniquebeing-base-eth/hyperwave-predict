import { useCallback, useState } from "react";
import { useAccount, useReadContract, useSendCalls } from "wagmi";
import { encodeFunctionData, formatUnits } from "viem";
import { BLOOM_REWARDS_ADDRESS, BLOOM_REWARDS_ABI } from "@/contracts/BloomRewards";
import { BLOOM_BETTING_ADDRESS, BLOOM_BETTING_ABI } from "@/lib/wagmiConfig";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function useBloomRewards() {
  const { address } = useAccount();
  const { sendCalls, reset: resetSendCalls } = useSendCalls();
  const [isClaiming, setIsClaiming] = useState(false);

  // On-chain stats drive entitlement
  const { data: statsData, refetch: refetchStats } = useReadContract({
    address: BLOOM_BETTING_ADDRESS,
    abi: BLOOM_BETTING_ABI,
    functionName: "getUserStats",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 15000 },
  });

  const { data: alreadyClaimed, refetch: refetchClaimed } = useReadContract({
    address: BLOOM_REWARDS_ADDRESS,
    abi: BLOOM_REWARDS_ABI,
    functionName: "claimed",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 15000 },
  });

  const totalBets = statsData ? Number(statsData.totalBets) : 0;
  const cumulativeBloom = totalBets * 1000; // human units, matches signer
  const claimedBloom = alreadyClaimed
    ? Number(formatUnits(alreadyClaimed as bigint, 18))
    : 0;
  const claimableBloom = Math.max(cumulativeBloom - claimedBloom, 0);

  const claim = useCallback(async (): Promise<{ success: boolean; amount: number }> => {
    if (!address) {
      toast({ title: "Not connected", description: "Connect your wallet first", variant: "destructive" });
      return { success: false, amount: 0 };
    }
    if (claimableBloom <= 0) {
      toast({ title: "Nothing to claim", description: "Play more rounds to earn rewards", variant: "destructive" });
      return { success: false, amount: 0 };
    }

    setIsClaiming(true);
    try {
      toast({ title: "Preparing claim...", description: "Generating signature" });

      const { data, error } = await supabase.functions.invoke("sign-claim-rewards", {
        body: { userAddress: address },
      });

      if (error || !data?.signature) {
        throw new Error(error?.message || data?.error || "Signature failed");
      }

      const cumulativeAmount = BigInt(data.cumulativeAmount);
      const nonce = BigInt(data.nonce);
      const signature = data.signature as `0x${string}`;
      const payoutWei = BigInt(data.payout);
      const payoutBloom = Number(formatUnits(payoutWei, 18));

      const claimData = encodeFunctionData({
        abi: BLOOM_REWARDS_ABI,
        functionName: "claim",
        args: [cumulativeAmount, nonce, signature],
      });

      toast({ title: "Confirm claim", description: "Confirm in your wallet" });

      return await new Promise((resolve) => {
        sendCalls(
          { calls: [{ to: BLOOM_REWARDS_ADDRESS, data: claimData }] },
          {
            onSuccess: async () => {
              // Poll for claimed update
              let confirmed = false;
              for (let i = 0; i < 20; i++) {
                await new Promise((r) => setTimeout(r, 2000));
                const { data: c } = await refetchClaimed();
                if (c && (c as bigint) >= cumulativeAmount) {
                  confirmed = true;
                  break;
                }
              }
              resetSendCalls();
              setIsClaiming(false);
              if (confirmed) {
                toast({
                  title: "Rewards claimed!",
                  description: `${payoutBloom.toLocaleString()} $BLOOM sent to your wallet`,
                });
                resolve({ success: true, amount: payoutBloom });
              } else {
                toast({
                  title: "Claim pending",
                  description: "Transaction sent — check your wallet shortly.",
                });
                resolve({ success: false, amount: payoutBloom });
              }
            },
            onError: (err: any) => {
              console.error("Claim error:", err);
              toast({
                title: "Claim failed",
                description: err.shortMessage || err.message || "Transaction rejected",
                variant: "destructive",
              });
              resetSendCalls();
              setIsClaiming(false);
              resolve({ success: false, amount: 0 });
            },
          }
        );
      });
    } catch (e: any) {
      console.error("Claim error:", e);
      toast({
        title: "Claim failed",
        description: e.message || "Could not generate claim signature",
        variant: "destructive",
      });
      setIsClaiming(false);
      return { success: false, amount: 0 };
    }
  }, [address, claimableBloom, sendCalls, resetSendCalls, refetchClaimed]);

  return {
    isClaiming,
    cumulativeBloom,
    claimedBloom,
    claimableBloom,
    claim,
    refetch: () => {
      refetchStats();
      refetchClaimed();
    },
  };
}
