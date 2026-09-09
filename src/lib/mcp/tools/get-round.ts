import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { directionLabel, formatBloom, formatPrice8, readBetting } from "../chain";

export default defineTool({
  name: "get_round",
  title: "Get a settled round",
  description:
    "Read any past or present round by id, including start price, end price, the settled result (up/down/none) and the final $BLOOM pools.",
  inputSchema: {
    roundId: z.number().int().positive().describe("The round id to read."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ roundId }) => {
    const round = await readBetting("getRound", [BigInt(roundId)]);

    const data = {
      roundId: Number(round.roundId),
      market: "ETH",
      startTime: Number(round.startTime),
      endTime: Number(round.endTime),
      startPriceUsd: formatPrice8(round.startPrice),
      endPriceUsd: formatPrice8(round.endPrice),
      resolved: Boolean(round.resolved),
      result: directionLabel(Number(round.result)),
      upPoolBloom: formatBloom(round.totalUpPool),
      downPoolBloom: formatBloom(round.totalDownPool),
    };

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: data,
    };
  },
});
