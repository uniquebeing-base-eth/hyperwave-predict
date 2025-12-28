import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const NEYNAR_API_KEY = Deno.env.get("NEYNAR_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FarcasterProfile {
  address: string;
  fid: number | null;
  username: string | null;
  displayName: string | null;
  pfpUrl: string | null;
}

async function getProfilesByAddresses(addresses: string[]): Promise<FarcasterProfile[]> {
  const profiles: FarcasterProfile[] = [];
  
  // Neynar's bulk lookup by verified addresses - process in batches of 10
  const batchSize = 10;
  
  for (let i = 0; i < addresses.length; i += batchSize) {
    const batch = addresses.slice(i, i + batchSize);
    
    for (const address of batch) {
      try {
        const response = await fetch(
          `https://api.neynar.com/v2/farcaster/user/by_verification?address=${address}`,
          {
            headers: {
              "api_key": NEYNAR_API_KEY || "",
              "Content-Type": "application/json",
            },
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            profiles.push({
              address: address.toLowerCase(),
              fid: data.user.fid,
              username: data.user.username,
              displayName: data.user.display_name,
              pfpUrl: data.user.pfp_url,
            });
            continue;
          }
        }
        
        // No Farcaster profile found
        profiles.push({
          address: address.toLowerCase(),
          fid: null,
          username: null,
          displayName: null,
          pfpUrl: null,
        });
      } catch (error) {
        console.error(`Error fetching profile for ${address}:`, error);
        profiles.push({
          address: address.toLowerCase(),
          fid: null,
          username: null,
          displayName: null,
          pfpUrl: null,
        });
      }
    }
  }
  
  return profiles;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { addresses } = await req.json();
    
    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return new Response(
        JSON.stringify({ error: "Addresses array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Limit to 50 addresses max
    const limitedAddresses = addresses.slice(0, 50);
    const profiles = await getProfilesByAddresses(limitedAddresses);
    
    return new Response(
      JSON.stringify({ profiles }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching profiles:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
