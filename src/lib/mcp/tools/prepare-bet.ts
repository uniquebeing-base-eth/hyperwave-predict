import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { encodeFunctionData, parseUnits } from "viem";
import { formatBloom, readBetting, readToken } from "../chain";
import {
  BLOOM_BETTING_ABI,
  BLOOM_BETTING_ADDRESS,
  BLOOM_TOKEN_ADDRESS,
  ERC20_ABI,
} from "@/contracts/BloomBetting";

/**
 * Returns unsigned Base transaction calldata so an external agent can place a
 * prediction with its own wallet. This tool never holds keys and never signs.
 */
export default defineTool({
  name: "prepare_bet",
  title: "Prepare a prediction transaction",
  description:
    "Build the unsigned Base transaction(s) needed to predict UP or DOWN on the current ETH round with $BLOOM. Returns an optional ERC-20 approval call plus the placeBet call, to be signed and sent by the caller's own wallet. Nothing is signed or submitted here.",
  inputSchema: {
    address: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/)
      .describe("The wallet address that will sign and send the transaction."),
    direction: z.enum(["up", "down"]).describe("Predicted ETH direction for this round."),
    amountBloom: z
      .number()
      .positive()
      .describe("Stake size in whole $BLOOM tokens (not wei)."),
  },
  annotations: { readOnlyHint: true, openWorldHint: true },
  handler: async ({ address, direction, amountBloom }) => {
    const amountWei = parseUnits(String(amountBloom), 18);

    const [bettingOpen, round, minimumStake, balance, allowance] = await Promise.all([
      readBetting("isBettingOpen"),
      readBetting("getCurrentRound"),
      readBetting("minimumStake"),
      readToken("balanceOf", [address]),
      readToken("allowance", [address, BLOOM_BETTING_ADDRESS]),
    ]);

    const roundId = Number(round.roundId);
    const alreadyBet = await readBetting("hasUserBetInRound", [round.roundId, address]);

    const problems: string[] = [];
    if (!bettingOpen) problems.push("Betting is closed for the current round.");
    if (alreadyBet) problems.push(`This wallet already placed a bet in round ${roundId}.`);
    if (amountWei < (minimumStake as bigint))
      problems.push(`Stake is below the minimum of ${formatBloom(minimumStake as bigint)} $BLOOM.`);
    if (balance < amountWei)
      problems.push(`Wallet holds only ${formatBloom(balance)} $BLOOM.`);

    if (problems.length > 0) {
      return {
        content: [{ type: "text", text: problems.join(" ") }],
        isError: true,
      };
    }

    const transactions: {
      step: string;
      chainId: number;
      to: string;
      data: string;
      value: string;
    }[] = [];

    if (allowance < amountWei) {
      transactions.push({
        step: "approve",
        chainId: 8453,
        to: BLOOM_TOKEN_ADDRESS,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "approve",
          args: [BLOOM_BETTING_ADDRESS, amountWei],
        }),
        value: "0",
      });
    }

    transactions.push({
      step: "placeBet",
      chainId: 8453,
      to: BLOOM_BETTING_ADDRESS,
      data: encodeFunctionData({
        abi: BLOOM_BETTING_ABI as any,
        functionName: "placeBet",
        args: [direction === "up" ? 1 : 2, amountWei],
      }),
      value: "0",
    });

    const data = {
      network: "base",
      chainId: 8453,
      roundId,
      direction,
      amountBloom,
      amountWei: amountWei.toString(),
      potentialPayoutBloom: amountBloom * 2,
      secondsRemaining: Number(round.endTime) - Math.floor(Date.now() / 1000),
      transactions,
      note: "Sign and broadcast these transactions in order from the given wallet. Draws count as a loss; payouts are 2x.",
    };

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: data,
    };
  },
});
