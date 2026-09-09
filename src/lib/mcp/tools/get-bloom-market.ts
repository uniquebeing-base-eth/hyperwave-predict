import { defineTool } from "@lovable.dev/mcp-js";
import { BLOOM_TOKEN_ADDRESS } from "../chain";

export default defineTool({
  name: "get_bloom_market",
  title: "Get $BLOOM market data",
  description:
    "Read live $BLOOM market data on Base (price in USD, 24h change, 24h volume, liquidity, market cap) plus the current ETH spot price used for predictions.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async (_input, ctx) => {
    const [bloomRes, ethRes] = await Promise.all([
      fetch(`https://api.dexscreener.com/latest/dex/tokens/${BLOOM_TOKEN_ADDRESS}`, {
        signal: ctx.signal,
      }),
      fetch("https://api.coinbase.com/v2/prices/ETH-USD/spot", { signal: ctx.signal }),
    ]);

    const bloomJson = bloomRes.ok ? await bloomRes.json() : null;
    const ethJson = ethRes.ok ? await ethRes.json() : null;
    const pair = bloomJson?.pairs?.[0];

    const data = {
      bloom: {
        tokenAddress: BLOOM_TOKEN_ADDRESS,
        chain: "base",
        priceUsd: pair ? Number(pair.priceUsd ?? 0) : null,
        priceChange24hPercent: pair?.priceChange?.h24 ?? null,
        volume24hUsd: pair?.volume?.h24 ?? null,
        liquidityUsd: pair?.liquidity?.usd ?? null,
        marketCapUsd: pair?.marketCap ?? pair?.fdv ?? null,
      },
      ethSpotUsd: ethJson?.data?.amount ? Number(ethJson.data.amount) : null,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: data,
    };
  },
});
