import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseAnon } from "../supabase";

export default defineTool({
  name: "get_leaderboard",
  title: "Get leaderboard",
  description:
    "Read the public prediction leaderboard for a period (24h, 7d, 30d or all): wallet, bets, wins, losses, win rate, staked, payout and profit in $BLOOM.",
  inputSchema: {
    period: z
      .enum(["24h", "7d", "30d", "all"])
      .describe("Time window for the ranking."),
    limit: z.number().int().min(1).max(50).optional().describe("How many rows to return (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ period, limit }) => {
    const supabase = supabaseAnon();
    const { data, error } = await supabase.rpc("get_leaderboard", { period });

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    const rows = (data ?? []).slice(0, limit ?? 10).map((row: any, i: number) => ({
      rank: i + 1,
      wallet: row.wallet_address,
      totalBets: row.total_bets,
      totalWins: row.total_wins,
      totalLosses: row.total_losses,
      winRatePercent: Number(row.win_rate ?? 0),
      stakedBloom: Number(row.staked ?? 0),
      payoutBloom: Number(row.payout ?? 0),
      profitBloom: Number(row.profit ?? 0),
    }));

    return {
      content: [{ type: "text", text: JSON.stringify({ period, rows }, null, 2) }],
      structuredContent: { period, rows },
    };
  },
});
