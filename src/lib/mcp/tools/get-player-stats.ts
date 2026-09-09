import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { formatBloom, readBetting } from "../chain";

const ADDRESS = z
  .string()
  .describe("Base wallet address of the player, e.g. 0x1234...abcd.");

export default defineTool({
  name: "get_player_stats",
  title: "Get player stats",
  description:
    "Read on-chain prediction stats for a wallet: total bets, wins, losses, current streak, best streak, amount staked and total won in $BLOOM. Also reports whether that wallet already bet in the current round.",
  inputSchema: { address: ADDRESS },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ address }) => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return { content: [{ type: "text", text: "Invalid Base wallet address." }], isError: true };
    }

    const [stats, round] = await Promise.all([
      readBetting("getUserStats", [address]),
      readBetting("getCurrentRound"),
    ]);

    const hasBetThisRound = await readBetting("hasUserBetInRound", [round.roundId, address]);

    const totalBets = Number(stats.totalBets ?? 0);
    const totalWins = Number(stats.totalWins ?? 0);

    const data = {
      address,
      totalBets,
      totalWins,
      totalLosses: Number(stats.totalLosses ?? 0),
      winRatePercent: totalBets > 0 ? Math.round((totalWins / totalBets) * 1000) / 10 : 0,
      currentStreak: Number(stats.currentStreak ?? 0),
      bestStreak: Number(stats.bestStreak ?? 0),
      totalStakedBloom: stats.totalStaked !== undefined ? formatBloom(stats.totalStaked) : 0,
      totalWonBloom: stats.totalWon !== undefined ? formatBloom(stats.totalWon) : 0,
      currentRoundId: Number(round.roundId),
      hasBetThisRound: Boolean(hasBetThisRound),
    };

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: data,
    };
  },
});
