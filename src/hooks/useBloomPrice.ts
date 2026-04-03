import { useQuery } from "@tanstack/react-query";

interface BloomPriceData {
  priceUsd: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  pairUrl: string;
}

const BLOOM_TOKEN_ADDRESS = "0xa07e759da6b3d4d75ed76f92fbcb867b9c145b07";

async function fetchBloomPrice(): Promise<BloomPriceData> {
  const res = await fetch(
    `https://api.dexscreener.com/latest/dex/tokens/${BLOOM_TOKEN_ADDRESS}`
  );
  if (!res.ok) throw new Error("Failed to fetch BLOOM price");
  const data = await res.json();

  const pair = data.pairs?.[0];
  if (!pair) {
    return {
      priceUsd: 0,
      priceChange24h: 0,
      volume24h: 0,
      liquidity: 0,
      marketCap: 0,
      pairUrl: "",
    };
  }

  return {
    priceUsd: parseFloat(pair.priceUsd || "0"),
    priceChange24h: pair.priceChange?.h24 ?? 0,
    volume24h: pair.volume?.h24 ?? 0,
    liquidity: pair.liquidity?.usd ?? 0,
    marketCap: pair.marketCap ?? pair.fdv ?? 0,
    pairUrl: pair.url || `https://dexscreener.com/base/${BLOOM_TOKEN_ADDRESS}`,
  };
}

export function useBloomPrice() {
  return useQuery({
    queryKey: ["bloom-price"],
    queryFn: fetchBloomPrice,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
