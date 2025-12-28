import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
  "function startRound(uint256 _startPrice)",
  "function settleRound(uint256 _roundId, uint256 _endPrice)",
];

const CHAINLINK_ABI = [
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
];

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
    
    if (currentRoundId > 0n) {
      const round = await bettingContract.getCurrentRound();
      resolved = round.resolved;
      endTime = round.endTime;
    }
    
    console.log(`Current Round: ${currentRoundId}`);
    console.log(`Betting Open: ${isBettingOpen}`);
    console.log(`Time Remaining: ${timeRemaining}s`);
    console.log(`Resolved: ${resolved}`);
    
    // Get current ETH price from Chainlink (8 decimals)
    const [, answer] = await chainlinkContract.latestRoundData();
    const ethPrice = answer > 0n ? answer : 0n;
    console.log(`Chainlink ETH/USD price: $${Number(ethPrice) / 1e8}`);
    
    let action = "none";
    let txHash = "";
    
    // Decision logic:
    // 1. If no round exists (roundId = 0) or current round is resolved → start new round
    // 2. If round exists, not resolved, and time is up → settle round
    
    if (currentRoundId === 0n || resolved) {
      // Start a new round
      console.log("Starting new round with price:", ethPrice.toString());
      
      const tx = await bettingContract.startRound(ethPrice);
      console.log(`Transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`Transaction confirmed in block ${receipt?.blockNumber}`);
      
      txHash = tx.hash;
      action = "startRound";
      
    } else if (!resolved && timeRemaining === 0n) {
      // Settle the current round, then immediately start the next round (keeps rounds continuous)
      console.log(`Settling round ${currentRoundId} with price:`, ethPrice.toString());

      const settleTx = await bettingContract.settleRound(currentRoundId, ethPrice);
      console.log(`Transaction sent: ${settleTx.hash}`);

      const settleReceipt = await settleTx.wait();
      console.log(`Transaction confirmed in block ${settleReceipt?.blockNumber}`);

      txHash = settleTx.hash;
      action = "settleRound";

      // Start next round right away using the same latest price as start price
      console.log("Starting next round immediately with price:", ethPrice.toString());

      const startTx = await bettingContract.startRound(ethPrice);
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
        ethPrice: ethPrice.toString(),
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
