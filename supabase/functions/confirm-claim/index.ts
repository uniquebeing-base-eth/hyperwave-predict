import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createPublicClient, http } from "https://esm.sh/viem@2.21.55";
import { base } from "https://esm.sh/viem@2.21.55/chains";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BLOOM_REWARDS_ADDRESS = "0xf077988E175f5EeCDa4d7cbab6881Dd148E24152";
const ONE_BLOOM = 10n ** 18n;

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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { userAddress, txHash, expectedClaimed, payout, nonce, multiplier, phaseNumber } =
      await req.json();

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

    // Verify on-chain that `claimed[user] >= expectedClaimed`
    const client = createPublicClient({ chain: base, transport: http() });
    const onchainClaimed = (await client.readContract({
      address: BLOOM_REWARDS_ADDRESS,
      abi: REWARDS_ABI,
      functionName: "claimed",
      args: [userAddress as `0x${string}`],
    })) as bigint;

    if (onchainClaimed < BigInt(expectedClaimed)) {
      return new Response(
        JSON.stringify({ error: "Claim not yet confirmed on-chain", onchainClaimed: onchainClaimed.toString() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Idempotent: insert if not already present for this phase
    const { data: existing } = await supabase
      .from("phase_claims")
      .select("id")
      .eq("wallet_address", wallet)
      .eq("phase_number", phaseNumber)
      .maybeSingle();

    if (existing) {
      // Update with tx_hash / confirmed_at if missing
      await supabase
        .from("phase_claims")
        .update({ tx_hash: txHash ?? null, confirmed_at: new Date().toISOString() })
        .eq("id", existing.id);
      return new Response(JSON.stringify({ ok: true, alreadyRecorded: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amountBloom = Number(BigInt(payout) / ONE_BLOOM);
    const { error: insertErr } = await supabase.from("phase_claims").insert({
      wallet_address: wallet,
      phase_number: phaseNumber,
      amount: amountBloom,
      multiplier: multiplier ?? 1,
      nonce: String(nonce ?? Date.now()),
      tx_hash: txHash ?? null,
      confirmed_at: new Date().toISOString(),
    });
    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("confirm-claim error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
