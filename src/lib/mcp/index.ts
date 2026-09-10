import { defineMcp } from "@lovable.dev/mcp-js";
import getCurrentRound from "./tools/get-current-round";
import getRound from "./tools/get-round";
import getPlayerStats from "./tools/get-player-stats";
import getLeaderboard from "./tools/get-leaderboard";
import getBloomMarket from "./tools/get-bloom-market";
import prepareBet from "./tools/prepare-bet";

export default defineMcp({
  name: "hyperwave-predict",
  title: "HyperWave Predict",
  version: "0.1.0",
  instructions:
    "Tools for HyperWave Predict, an ETH up/down prediction game on Base staked in $BLOOM. Use get_current_round for the live round, get_round for history, get_player_stats for a wallet's record, get_leaderboard for rankings and get_bloom_market for prices. Use prepare_bet to build unsigned Base transactions the caller signs with its own wallet; this server never signs or holds funds.",
  tools: [
    getCurrentRound,
    getRound,
    getPlayerStats,
    getLeaderboard,
    getBloomMarket,
    prepareBet,
  ],
});
