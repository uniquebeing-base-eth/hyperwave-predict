import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createPublicClient, http, encodePacked, keccak256 } from "https://esm.sh/viem@2.21.55";
import { base } from "https://esm.sh/viem@2.21.55/chains";
import { privateKeyToAccount } from "https://esm.sh/viem@2.21.55/accounts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BLOOM_REWARDS_ADDRESS = "0xf077988E175f5EeCDa4d7cbab6881Dd148E24152";
const BLOOM_BETTING_ADDRESS = "0x9cE39DDf290094e9915E2D908b6D99e33167c977";
const BLOOM_PER_BET = 1000n;
const ONE_BLOOM = 10n ** 18n;

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

    const wallet = (userAddress as string).toLowerCase();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Current phase
    const { data: phase, error: phaseErr } = await supabase
      .from("phase_state")
      .select("phase_number")
      .eq("id", 1)
      .single();
    if (phaseErr || !phase) throw new Error("Failed to read phase state");
    const phaseNumber = phase.phase_number as number;

    // Already claimed this phase? Only block if a CONFIRMED claim exists.
    const { data: existing } = await supabase
      .from("phase_claims")
      .select("id, confirmed_at")
      .eq("wallet_address", wallet)
      .eq("phase_number", phaseNumber)
      .not("confirmed_at", "is", null)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "Already claimed this phase. Next claim opens when the phase ends." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pkRaw = Deno.env.get("ORACLE_PRIVATE_KEY")!;
    const pk = (pkRaw.startsWith("0x") ? pkRaw : `0x${pkRaw}`) as `0x${string}`;
    const account = privateKeyToAccount(pk);

    const client = createPublicClient({ chain: base, transport: http() });

    const stats = (await client.readContract({
      address: BLOOM_BETTING_ADDRESS,
      abi: BETTING_ABI,
      functionName: "getUserStats",
      args: [userAddress as `0x${string}`],
    })) as { totalBets: bigint; currentStreak: bigint };

    const alreadyClaimed = (await client.readContract({
      address: BLOOM_REWARDS_ADDRESS,
      abi: REWARDS_ABI,
      functionName: "claimed",
      args: [userAddress as `0x${string}`],
    })) as bigint;

    // Base earnings since last claim (wei)
    const baseCumulative = stats.totalBets * BLOOM_PER_BET * ONE_BLOOM;
    if (baseCumulative <= alreadyClaimed) {
      return new Response(JSON.stringify({ error: "Nothing to claim" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const baseDelta = baseCumulative - alreadyClaimed;

    // Apply 2x multiplier if 7-day streak
    const multiplier = stats.currentStreak >= 7n ? 2 : 1;
    const payout = multiplier === 2 ? baseDelta * 2n : baseDelta;
    const cumulativeAmount = alreadyClaimed + payout;

    const nonce = BigInt(Date.now());
    const chainId = BigInt(base.id);

    const messageHash = keccak256(
      encodePacked(
        ["address", "uint256", "uint256", "uint256", "address"],
        [userAddress as `0x${string}`, cumulativeAmount, nonce, chainId, BLOOM_REWARDS_ADDRESS as `0x${string}`]
      )
    );

    const signature = await account.signMessage({ message: { raw: messageHash } });

    // Record claim (locks user out for this phase). If user fails to submit on-chain,
    // they can re-claim next phase — by design.
    const { error: insertErr } = await supabase.from("phase_claims").insert({
      wallet_address: wallet,
      phase_number: phaseNumber,
      amount: Number(payout / ONE_BLOOM),
      multiplier,
      nonce: nonce.toString(),
    });

    if (insertErr) {
      if (insertErr.code === "23505") {
        return new Response(
          JSON.stringify({ error: "Already claimed this phase." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw insertErr;
    }

    // NOTE: We deliberately DO NOT insert into phase_claims here.
    // The claim is only recorded once the on-chain tx is confirmed,
    // via the `confirm-claim` edge function. This prevents a canceled
    // or failed transaction from locking the user out of the phase.

    return new Response(
      JSON.stringify({
        cumulativeAmount: cumulativeAmount.toString(),
        nonce: nonce.toString(),
        signature,
        payout: payout.toString(),
        multiplier,
        phaseNumber,
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
