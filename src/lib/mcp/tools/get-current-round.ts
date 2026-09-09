import { defineTool } from "@lovable.dev/mcp-js";
import { directionLabel, formatBloom, formatPrice8, readBetting } from "../chain";

export default defineTool({
  name: "get_current_round",
  title: "Get current round",
  description:
    "Read the live ETH prediction round on Base: round id, start price, seconds remaining, whether betting is still open, the UP/DOWN $BLOOM pools and the number of bets placed.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async () => {
    const [round, timeRemaining, bettingOpen, betCount, minimumStake] = await Promise.all([
      readBetting("getCurrentRound"),
      readBetting("getTimeRemaining"),
      readBetting("isBettingOpen"),
      readBetting("getCurrentRoundBetCount"),
      readBetting("minimumStake"),
    ]);

    const upPool = formatBloom(round.totalUpPool);
    const downPool = formatBloom(round.totalDownPool);
    const total = upPool + downPool;

    const data = {
      roundId: Number(round.roundId),
      market: "ETH",
      stakeToken: "BLOOM",
      startPriceUsd: formatPrice8(round.startPrice),
      startTime: Number(round.startTime),
      endTime: Number(round.endTime),
      secondsRemaining: Number(timeRemaining),
      bettingOpen: Boolean(bettingOpen),
      resolved: Boolean(round.resolved),
      result: directionLabel(Number(round.result)),
      upPoolBloom: upPool,
      downPoolBloom: downPool,
      upSharePercent: total > 0 ? Math.round((upPool / total) * 100) : 50,
      downSharePercent: total > 0 ? Math.round((downPool / total) * 100) : 50,
      betCount: Number(betCount),
      minimumStakeBloom: formatBloom(minimumStake),
      payoutMultiplier: 2,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: data,
    };
  },
});
