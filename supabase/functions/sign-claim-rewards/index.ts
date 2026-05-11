import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createPublicClient, http, privateKeyToAccount, encodePacked, keccak256 } from "https://esm.sh/viem@2.21.55";
import { base } from "https://esm.sh/viem@2.21.55/chains";
import { privateKeyToAccount as toAccount } from "https://esm.sh/viem@2.21.55/accounts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BLOOM_REWARDS_ADDRESS = "0xf077988E175f5EeCDa4d7cbab6881Dd148E24152";
const BLOOM_BETTING_ADDRESS = "0x9cE39DDf290094e9915E2D908b6D99e33167c977";
const BLOOM_PER_BET = 1000n; // matches UI: rewards = totalBets * 1000
const DECIMALS = 18n;
const ONE_BLOOM = 10n ** DECIMALS;

const BETTING_ABI = [
  {
    inputs: [{ internalType: "address", name: "_user", type: "address" }],
    name: "getUserStats",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "totalBets", type: "uint256" },
          { internalType: "uint256", name: "totalWins", type: "uint256" },
          { internalType: "uint256", name: "totalLosses", type: "uint256" },
          { internalType: "uint256", name: "totalStaked", type: "uint256" },
          { internalType: "uint256", name: "totalProfits", type: "uint256" },
          { internalType: "uint256", name: "currentStreak", type: "uint256" },
          { internalType: "uint256", name: "lastPlayedDay", type: "uint256" },
        ],
        internalType: "struct BloomBetting.UserStats",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

const REWARDS_ABI = [
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "claimed",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userAddress } = await req.json();

    if (!userAddress || !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return new Response(JSON.stringify({ error: "Invalid userAddress" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pkRaw = Deno.env.get("ORACLE_PRIVATE_KEY")!;
    const pk = (pkRaw.startsWith("0x") ? pkRaw : `0x${pkRaw}`) as `0x${string}`;
    const account = toAccount(pk);

    const client = createPublicClient({ chain: base, transport: http() });

    // Compute cumulative entitlement from on-chain stats
    const stats = (await client.readContract({
      address: BLOOM_BETTING_ADDRESS,
      abi: BETTING_ABI,
      functionName: "getUserStats",
      args: [userAddress as `0x${string}`],
    })) as { totalBets: bigint; currentStreak: bigint };

    const cumulativeAmount = stats.totalBets * BLOOM_PER_BET * ONE_BLOOM;

    if (cumulativeAmount === 0n) {
      return new Response(JSON.stringify({ error: "Nothing to claim" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check already claimed
    const alreadyClaimed = (await client.readContract({
      address: BLOOM_REWARDS_ADDRESS,
      abi: REWARDS_ABI,
      functionName: "claimed",
      args: [userAddress as `0x${string}`],
    })) as bigint;

    if (cumulativeAmount <= alreadyClaimed) {
      return new Response(JSON.stringify({ error: "Nothing new to claim" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nonce = BigInt(Date.now());
    const chainId = BigInt(base.id);

    const messageHash = keccak256(
      encodePacked(
        ["address", "uint256", "uint256", "uint256", "address"],
        [userAddress as `0x${string}`, cumulativeAmount, nonce, chainId, BLOOM_REWARDS_ADDRESS as `0x${string}`]
      )
    );

    const signature = await account.signMessage({
      message: { raw: messageHash },
    });

    const payout = cumulativeAmount - alreadyClaimed;

    return new Response(
      JSON.stringify({
        cumulativeAmount: cumulativeAmount.toString(),
        nonce: nonce.toString(),
        signature,
        payout: payout.toString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("sign-claim-rewards error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
