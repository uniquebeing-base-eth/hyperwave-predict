import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const NEYNAR_API_KEY = Deno.env.get("NEYNAR_API_KEY");
const BLOOM_TOKEN_ADDRESS = "0xa07e759da6b3d4d75ed76f92fbcb867b9c145b07";
const BASE_RPC_URL = "https://mainnet.base.org";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ERC20 selectors
const BALANCE_OF_SELECTOR = "0x70a08231";
const DECIMALS_SELECTOR = "0x313ce567";

function formatWithCommas(value: string) {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

async function getEthBalance(address: string): Promise<string> {
  const response = await fetch(BASE_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getBalance",
      params: [address, "latest"],
      id: 1,
    }),
  });
  
  const data = await response.json();
  if (data.result) {
    const balanceWei = BigInt(data.result);
    const balanceEth = Number(balanceWei) / 1e18;
    return balanceEth.toFixed(4);
  }
  return "0";
}

async function getTokenDecimals(tokenAddress: string): Promise<number> {
  const response = await fetch(BASE_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_call",
      params: [
        {
          to: tokenAddress,
          data: DECIMALS_SELECTOR,
        },
        "latest",
      ],
      id: 1,
    }),
  });

  const data = await response.json();
  if (data.result && data.result !== "0x") {
    return Number(BigInt(data.result));
  }
  return 18;
}

async function getTokenBalance(
  tokenAddress: string,
  walletAddress: string,
  decimals: number
): Promise<string> {
  // Encode the balanceOf call data
  const paddedAddress = walletAddress.slice(2).toLowerCase().padStart(64, "0");
  const callData = BALANCE_OF_SELECTOR + paddedAddress;

  const response = await fetch(BASE_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_call",
      params: [
        {
          to: tokenAddress,
          data: callData,
        },
        "latest",
      ],
      id: 1,
    }),
  });

  const data = await response.json();
  if (data.result && data.result !== "0x") {
    const balanceRaw = BigInt(data.result);
    const divisor = 10n ** BigInt(decimals);
    const whole = balanceRaw / divisor;
    return formatWithCommas(whole.toString());
  }
  return "0";
}

function pickPrimaryEthAddress(user: any): string | null {
  // Neynar returns both `verifications` and `verified_addresses`. In practice,
  // Farcaster clients treat the first verification as the user's primary wallet.
  const verifications = Array.isArray(user?.verifications) ? user.verifications : null;
  if (verifications && verifications.length > 0 && typeof verifications[0] === "string") {
    return verifications[0];
  }

  const verified = user?.verified_addresses?.eth_addresses;
  if (Array.isArray(verified) && verified.length > 0 && typeof verified[0] === "string") {
    return verified[0];
  }

  if (typeof user?.custody_address === "string" && user.custody_address) {
    return user.custody_address;
  }

  return null;
}

async function getUserPrimaryAddress(fid: number): Promise<string | null> {
  const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
    headers: {
      "api_key": NEYNAR_API_KEY || "",
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  if (data.users && data.users.length > 0) {
    const user = data.users[0];
    return pickPrimaryEthAddress(user);
  }

  return null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { fid } = await req.json();
    
    if (!fid) {
      return new Response(
        JSON.stringify({ error: "FID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get user's verified Ethereum address from Neynar
    const walletAddress = await getUserPrimaryAddress(fid);
    
    if (!walletAddress) {
      return new Response(
        JSON.stringify({ 
          ethBalance: "0",
          bloomBalance: "0",
          address: null,
          error: "No verified wallet address found"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const tokenDecimals = await getTokenDecimals(BLOOM_TOKEN_ADDRESS);

    // Fetch balances in parallel
    const [ethBalance, bloomBalance] = await Promise.all([
      getEthBalance(walletAddress),
      getTokenBalance(BLOOM_TOKEN_ADDRESS, walletAddress, tokenDecimals),
    ]);
    return new Response(
      JSON.stringify({
        ethBalance,
        bloomBalance,
        address: walletAddress,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching balances:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
