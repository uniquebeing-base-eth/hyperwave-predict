import { defineTool } from "@lovable.dev/mcp-js";
import {
  BLOOM_BETTING_ABI,
  BLOOM_BETTING_ADDRESS,
  directionLabel,
  formatBloom,
  formatPrice8,
  publicClient,
} from "../chain";

export default defineTool({
  name: "get_current_round",
  title: "Get current round",
  description:
    "Read the live ETH prediction round on Base: round id, start price, seconds remaining, whether betting is still open, the UP/DOWN $BLOOM pools and the number of bets placed.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async () => {
    const client = publicClient();
    const common = { address: BLOOM_BETTING_ADDRESS, abi: BLOOM_BETTING_ABI } as const;

    const [round, timeRemaining, bettingOpen, betCount, minimumStake] = await Promise.all([
      client.readContract({ ...common, functionName: "getCurrentRound" }),
      client.readContract({ ...common, functionName: "getTimeRemaining" }),
      client.readContract({ ...common, functionName: "isBettingOpen" }),
      client.readContract({ ...common, functionName: "getCurrentRoundBetCount" }),
      client.readContract({ ...common, functionName: "minimumStake" }),
    ]);

    const r = round as {
      roundId: bigint;
      startTime: bigint;
      endTime: bigint;
      startPrice: bigint;
      endPrice: bigint;
      totalUpPool: bigint;
      totalDownPool: bigint;
      result: number;
      resolved: boolean;
    };

    const upPool = formatBloom(r.totalUpPool);
    const downPool = formatBloom(r.totalDownPool);
    const total = upPool + downPool;

    const data = {
      roundId: Number(r.roundId),
      market: "ETH",
      stakeToken: "BLOOM",
      startPriceUsd: formatPrice8(r.startPrice),
      startTime: Number(r.startTime),
      endTime: Number(r.endTime),
      secondsRemaining: Number(timeRemaining as bigint),
      bettingOpen: Boolean(bettingOpen),
      resolved: r.resolved,
      result: directionLabel(Number(r.result)),
      upPoolBloom: upPool,
      downPoolBloom: downPool,
      upSharePercent: total > 0 ? Math.round((upPool / total) * 100) : 50,
      downSharePercent: total > 0 ? Math.round((downPool / total) * 100) : 50,
      betCount: Number(betCount as bigint),
      minimumStakeBloom: formatBloom(minimumStake as bigint),
      payoutMultiplier: 2,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: data,
    };
  },
});
