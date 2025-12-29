import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.9.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Contract addresses
const BLOOM_BETTING_ADDRESS = "0x9cE39DDf290094e9915E2D908b6D99e33167c977";
const CHAINLINK_ETH_USD = "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70"; // Base mainnet

// Minimal ABIs
const BETTING_ABI = [
  "function currentRoundId() view returns (uint256)",
  "function isBettingOpen() view returns (bool)",
  "function getTimeRemaining() view returns (uint256)",
  "function getCurrentRound() view returns (tuple(uint256 roundId, uint256 startTime, uint256 endTime, uint256 startPrice, uint256 endPrice, uint256 totalUpPool, uint256 totalDownPool, uint8 result, bool resolved))",
  "function getRoundBets(uint256 _roundId) view returns (tuple(uint256 betId, uint256 roundId, address user, uint8 direction, uint256 amount, uint256 timestamp, uint8 result, uint256 payout)[])",
  "function startRound(uint256 _startPrice)",
  "function settleRound(uint256 _roundId, uint256 _endPrice)",
];

const CHAINLINK_ABI = [
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
];

const PRICE_SCALE = 100000000n; // 8 decimals

function parseUsdTo8Decimals(input: string): bigint {
  const s = String(input).trim();
  if (!s) return 0n;

  const [intPartRaw, fracRaw = ""] = s.split(".");
  const intPart = intPartRaw.replace(/[^0-9]/g, "") || "0";
  const frac = fracRaw.replace(/[^0-9]/g, "");
  const fracPadded = (frac + "00000000").slice(0, 8);

  return BigInt(intPart) * PRICE_SCALE + BigInt(fracPadded || "0");
}

async function fetchSpotEthUsd8(): Promise<bigint | null> {
  try {
    const res = await fetch("https://api.coinbase.com/v2/prices/ETH-USD/spot", {
      headers: { "User-Agent": "HyperWave Oracle" },
    });
    if (!res.ok) {
      console.log("Coinbase spot fetch failed:", res.status);
      return null;
    }
    const json = await res.json();
    const amount = String(json?.data?.amount ?? "");
    const parsed = parseUsdTo8Decimals(amount);
    return parsed > 0n ? parsed : null;
  } catch (e) {
    console.log("Coinbase spot fetch error:", e);
    return null;
  }
}

// Direction enum matching the contract
enum Direction {
  None = 0,
  Up = 1,
  Down = 2
}

// BetResult enum matching the contract
enum BetResult {
  Pending = 0,
  Win = 1,
  Lose = 2
}

async function syncRoundBetsToDatabase(
  supabase: any,
  bettingContract: ethers.Contract,
  roundId: bigint,
  startPrice: bigint,
  endPrice: bigint,
  settledAt: Date
) {
  try {
    console.log(`Syncing bets for round ${roundId} to database...`);
    
    const bets = await bettingContract.getRoundBets(roundId);
    console.log(`Found ${bets.length} bets in round ${roundId}`);
    
    if (bets.length === 0) return;

    const records = bets.map((bet: any) => {
      const result = bet.result === BetResult.Win ? 'win' : 'loss';
      const direction = bet.direction === Direction.Up ? 'up' : 'down';
      
      return {
        chain_bet_id: Number(bet.betId),
        round_id: Number(bet.roundId),
        wallet_address: bet.user.toLowerCase(),
        direction,
        amount: Number(ethers.formatUnits(bet.amount, 18)),
        result,
        payout: Number(ethers.formatUnits(bet.payout, 18)),
        placed_at: new Date(Number(bet.timestamp) * 1000).toISOString(),
        settled_at: settledAt.toISOString(),
        start_price: Number(startPrice) / 1e8,
        end_price: Number(endPrice) / 1e8,
      };
    });

    // Upsert to avoid duplicates (using chain_bet_id unique constraint)
    const { error } = await supabase
      .from('leaderboard_bets')
      .upsert(records, { onConflict: 'chain_bet_id' });

    if (error) {
      console.error('Error upserting bets to database:', error);
    } else {
      console.log(`Successfully synced ${records.length} bets to leaderboard_bets`);
    }
  } catch (err) {
    console.error('Error syncing round bets:', err);
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const privateKey = Deno.env.get("ORACLE_PRIVATE_KEY");
    if (!privateKey) {
      throw new Error("ORACLE_PRIVATE_KEY not configured");
    }
    
    // Add 0x prefix if missing
    const formattedKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
    
    console.log("=== Oracle Automation Started ===");
    
    // Initialize Supabase client for database sync
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn("Supabase credentials not configured, skipping database sync");
    }
    
    const supabase = supabaseUrl && supabaseServiceKey 
      ? createClient(supabaseUrl, supabaseServiceKey)
      : null;
    
    // Connect to Base mainnet
    const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
    const wallet = new ethers.Wallet(formattedKey, provider);
    
    console.log(`Oracle wallet: ${wallet.address}`);
    
    // Initialize contracts
    const bettingContract = new ethers.Contract(BLOOM_BETTING_ADDRESS, BETTING_ABI, wallet);
    const chainlinkContract = new ethers.Contract(CHAINLINK_ETH_USD, CHAINLINK_ABI, provider);
    
    // Get current contract state
    const currentRoundId = await bettingContract.currentRoundId();
    const isBettingOpen = await bettingContract.isBettingOpen();
    const timeRemaining = await bettingContract.getTimeRemaining();
    
    let resolved = false;
    let endTime = 0n;
    let startPrice = 0n;

    if (currentRoundId > 0n) {
      const round = await bettingContract.getCurrentRound();
      resolved = round.resolved;
      endTime = round.endTime;
      startPrice = round.startPrice;
    }

    console.log(`Current Round: ${currentRoundId}`);
    console.log(`Betting Open: ${isBettingOpen}`);
    console.log(`Time Remaining: ${timeRemaining}s`);
    console.log(`Resolved: ${resolved}`);
    console.log(`Start Price (8dp): ${startPrice}`);

    // Get current ETH price from Chainlink (8 decimals)
    const [, answer] = await chainlinkContract.latestRoundData();
    let priceUsed = answer > 0n ? answer : 0n;
    console.log(`Chainlink ETH/USD price: $${Number(priceUsed) / 1e8}`);

    // If Chainlink doesn't update during the round, startPrice can equal endPrice → draws.
    // To avoid constant draws, we fall back to a spot price feed when settling and the value is unchanged.
    const getSettlePrice = async () => {
      if (startPrice > 0n && priceUsed === startPrice) {
        const spot = await fetchSpotEthUsd8();
        if (spot && spot !== startPrice) {
          console.log("Chainlink unchanged; using spot price:", spot.toString());
          return spot;
        }
      }
      return priceUsed;
    };
    
    let action = "none";
    let txHash = "";
    
    // Decision logic:
    // 1. If no round exists (roundId = 0) or current round is resolved → start new round
    // 2. If round exists, not resolved, and time is up → settle round
    
    if (currentRoundId === 0n || resolved) {
      // Start a new round
      console.log("Starting new round with price:", priceUsed.toString());

      const tx = await bettingContract.startRound(priceUsed);
      console.log(`Transaction sent: ${tx.hash}`);

      const receipt = await tx.wait();
      console.log(`Transaction confirmed in block ${receipt?.blockNumber}`);

      txHash = tx.hash;
      action = "startRound";

    } else if (!resolved && timeRemaining === 0n) {
      const settlePrice = await getSettlePrice();
      priceUsed = settlePrice;

      // Settle the current round, then immediately start the next round (keeps rounds continuous)
      console.log(`Settling round ${currentRoundId} with price:`, settlePrice.toString());

      const settleTx = await bettingContract.settleRound(currentRoundId, settlePrice);
      console.log(`Transaction sent: ${settleTx.hash}`);

      const settleReceipt = await settleTx.wait();
      console.log(`Transaction confirmed in block ${settleReceipt?.blockNumber}`);

      txHash = settleTx.hash;
      action = "settleRound";
      
      // Sync the settled round's bets to the database
      if (supabase) {
        await syncRoundBetsToDatabase(
          supabase,
          bettingContract,
          currentRoundId,
          startPrice,
          settlePrice,
          new Date()
        );
      }

      // Start next round right away using the settle price as start price
      console.log("Starting next round immediately with price:", settlePrice.toString());

      const startTx = await bettingContract.startRound(settlePrice);
      console.log(`Transaction sent: ${startTx.hash}`);

      const startReceipt = await startTx.wait();
      console.log(`Transaction confirmed in block ${startReceipt?.blockNumber}`);

    } else {
      console.log(`Round ${currentRoundId} is active with ${timeRemaining}s remaining. No action needed.`);
    }
    
    const response = {
      success: true,
      action,
      txHash,
      state: {
        currentRoundId: currentRoundId.toString(),
        isBettingOpen,
        timeRemaining: timeRemaining.toString(),
        resolved,
        ethPrice: priceUsed.toString(),
      },
    };
    
    console.log("=== Oracle Automation Complete ===", response);
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Oracle automation error:", errMsg);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errMsg 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
