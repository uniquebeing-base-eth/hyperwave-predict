export const BLOOM_BETTING_ADDRESS = "0x9cE39DDf290094e9915E2D908b6D99e33167c977" as const;
export const BLOOM_TOKEN_ADDRESS = "0xa07e759da6b3d4d75ed76f92fbcb867b9c145b07" as const;
export const ORACLE_ADDRESS = "0xc6340F29b11F450877741a2f61A04D31Cb44d9B1" as const;

export const BLOOM_BETTING_ABI = [
  { inputs: [{ internalType: "address", name: "_bloomToken", type: "address" }, { internalType: "address", name: "_priceOracle", type: "address" }], stateMutability: "nonpayable", type: "constructor" },
  { inputs: [{ internalType: "address", name: "owner", type: "address" }], name: "OwnableInvalidOwner", type: "error" },
  { inputs: [{ internalType: "address", name: "account", type: "address" }], name: "OwnableUnauthorizedAccount", type: "error" },
  { inputs: [], name: "ReentrancyGuardReentrantCall", type: "error" },
  { inputs: [{ internalType: "address", name: "token", type: "address" }], name: "SafeERC20FailedOperation", type: "error" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "uint256", name: "roundId", type: "uint256" }, { indexed: true, internalType: "uint256", name: "betId", type: "uint256" }, { indexed: true, internalType: "address", name: "user", type: "address" }, { indexed: false, internalType: "enum BloomBetting.Direction", name: "direction", type: "uint8" }, { indexed: false, internalType: "uint256", name: "amount", type: "uint256" }], name: "BetPlaced", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "to", type: "address" }, { indexed: false, internalType: "uint256", name: "amount", type: "uint256" }], name: "HouseProfitsWithdrawn", type: "event" },
  { anonymous: false, inputs: [{ indexed: false, internalType: "uint256", name: "oldMinimum", type: "uint256" }, { indexed: false, internalType: "uint256", name: "newMinimum", type: "uint256" }], name: "MinimumStakeUpdated", type: "event" },
  { anonymous: false, inputs: [{ indexed: false, internalType: "address", name: "oldOracle", type: "address" }, { indexed: false, internalType: "address", name: "newOracle", type: "address" }], name: "OracleUpdated", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "previousOwner", type: "address" }, { indexed: true, internalType: "address", name: "newOwner", type: "address" }], name: "OwnershipTransferred", type: "event" },
  { anonymous: false, inputs: [{ indexed: false, internalType: "bool", name: "isPaused", type: "bool" }], name: "Paused", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "uint256", name: "roundId", type: "uint256" }, { indexed: false, internalType: "uint256", name: "totalRefunded", type: "uint256" }], name: "RoundCancelled", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "uint256", name: "roundId", type: "uint256" }, { indexed: false, internalType: "enum BloomBetting.Direction", name: "result", type: "uint8" }, { indexed: false, internalType: "uint256", name: "endPrice", type: "uint256" }, { indexed: false, internalType: "uint256", name: "totalPayouts", type: "uint256" }], name: "RoundSettled", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "uint256", name: "roundId", type: "uint256" }, { indexed: false, internalType: "uint256", name: "startTime", type: "uint256" }, { indexed: false, internalType: "uint256", name: "startPrice", type: "uint256" }], name: "RoundStarted", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "user", type: "address" }, { indexed: false, internalType: "uint256", name: "streak", type: "uint256" }], name: "StreakUpdated", type: "event" },
  { inputs: [], name: "BETTING_CUTOFF", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "HOUSE_EDGE_BP", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "PAYOUT_MULTIPLIER", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "ROUND_DURATION", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "", type: "uint256" }], name: "betsById", outputs: [{ internalType: "uint256", name: "betId", type: "uint256" }, { internalType: "uint256", name: "roundId", type: "uint256" }, { internalType: "address", name: "user", type: "address" }, { internalType: "enum BloomBetting.Direction", name: "direction", type: "uint8" }, { internalType: "uint256", name: "amount", type: "uint256" }, { internalType: "uint256", name: "timestamp", type: "uint256" }, { internalType: "enum BloomBetting.BetResult", name: "result", type: "uint8" }, { internalType: "uint256", name: "payout", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "bloomToken", outputs: [{ internalType: "contract IERC20", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "currentRoundId", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "_roundId", type: "uint256" }], name: "emergencyCancelRound", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "_betId", type: "uint256" }], name: "getBet", outputs: [{ components: [{ internalType: "uint256", name: "betId", type: "uint256" }, { internalType: "uint256", name: "roundId", type: "uint256" }, { internalType: "address", name: "user", type: "address" }, { internalType: "enum BloomBetting.Direction", name: "direction", type: "uint8" }, { internalType: "uint256", name: "amount", type: "uint256" }, { internalType: "uint256", name: "timestamp", type: "uint256" }, { internalType: "enum BloomBetting.BetResult", name: "result", type: "uint8" }, { internalType: "uint256", name: "payout", type: "uint256" }], internalType: "struct BloomBetting.Bet", name: "", type: "tuple" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getCurrentPools", outputs: [{ internalType: "uint256", name: "upPool", type: "uint256" }, { internalType: "uint256", name: "downPool", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getCurrentRound", outputs: [{ components: [{ internalType: "uint256", name: "roundId", type: "uint256" }, { internalType: "uint256", name: "startTime", type: "uint256" }, { internalType: "uint256", name: "endTime", type: "uint256" }, { internalType: "uint256", name: "startPrice", type: "uint256" }, { internalType: "uint256", name: "endPrice", type: "uint256" }, { internalType: "uint256", name: "totalUpPool", type: "uint256" }, { internalType: "uint256", name: "totalDownPool", type: "uint256" }, { internalType: "enum BloomBetting.Direction", name: "result", type: "uint8" }, { internalType: "bool", name: "resolved", type: "bool" }], internalType: "struct BloomBetting.Round", name: "", type: "tuple" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getCurrentRoundBetCount", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getHouseBalance", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "_roundId", type: "uint256" }], name: "getRound", outputs: [{ components: [{ internalType: "uint256", name: "roundId", type: "uint256" }, { internalType: "uint256", name: "startTime", type: "uint256" }, { internalType: "uint256", name: "endTime", type: "uint256" }, { internalType: "uint256", name: "startPrice", type: "uint256" }, { internalType: "uint256", name: "endPrice", type: "uint256" }, { internalType: "uint256", name: "totalUpPool", type: "uint256" }, { internalType: "uint256", name: "totalDownPool", type: "uint256" }, { internalType: "enum BloomBetting.Direction", name: "result", type: "uint8" }, { internalType: "bool", name: "resolved", type: "bool" }], internalType: "struct BloomBetting.Round", name: "", type: "tuple" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "_roundId", type: "uint256" }], name: "getRoundBetIds", outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "_roundId", type: "uint256" }], name: "getRoundBets", outputs: [{ components: [{ internalType: "uint256", name: "betId", type: "uint256" }, { internalType: "uint256", name: "roundId", type: "uint256" }, { internalType: "address", name: "user", type: "address" }, { internalType: "enum BloomBetting.Direction", name: "direction", type: "uint8" }, { internalType: "uint256", name: "amount", type: "uint256" }, { internalType: "uint256", name: "timestamp", type: "uint256" }, { internalType: "enum BloomBetting.BetResult", name: "result", type: "uint8" }, { internalType: "uint256", name: "payout", type: "uint256" }], internalType: "struct BloomBetting.Bet[]", name: "", type: "tuple[]" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getTimeRemaining", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "_user", type: "address" }], name: "getUserBetIds", outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "_user", type: "address" }], name: "getUserStats", outputs: [{ components: [{ internalType: "uint256", name: "totalBets", type: "uint256" }, { internalType: "uint256", name: "totalWins", type: "uint256" }, { internalType: "uint256", name: "totalLosses", type: "uint256" }, { internalType: "uint256", name: "totalStaked", type: "uint256" }, { internalType: "uint256", name: "totalProfits", type: "uint256" }, { internalType: "uint256", name: "currentStreak", type: "uint256" }, { internalType: "uint256", name: "lastPlayedDay", type: "uint256" }], internalType: "struct BloomBetting.UserStats", name: "", type: "tuple" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "", type: "uint256" }, { internalType: "address", name: "", type: "address" }], name: "hasUserBetInRound", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "_user", type: "address" }], name: "hasUserBetThisRound", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "isBettingOpen", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "minimumStake", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "nextBetId", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "owner", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "paused", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "enum BloomBetting.Direction", name: "_direction", type: "uint8" }, { internalType: "uint256", name: "_amount", type: "uint256" }], name: "placeBet", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "priceOracle", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "renounceOwnership", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "", type: "uint256" }, { internalType: "uint256", name: "", type: "uint256" }], name: "roundBetIds", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "", type: "uint256" }], name: "rounds", outputs: [{ internalType: "uint256", name: "roundId", type: "uint256" }, { internalType: "uint256", name: "startTime", type: "uint256" }, { internalType: "uint256", name: "endTime", type: "uint256" }, { internalType: "uint256", name: "startPrice", type: "uint256" }, { internalType: "uint256", name: "endPrice", type: "uint256" }, { internalType: "uint256", name: "totalUpPool", type: "uint256" }, { internalType: "uint256", name: "totalDownPool", type: "uint256" }, { internalType: "enum BloomBetting.Direction", name: "result", type: "uint8" }, { internalType: "bool", name: "resolved", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "_newMinimum", type: "uint256" }], name: "setMinimumStake", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "bool", name: "_paused", type: "bool" }], name: "setPaused", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "_newOracle", type: "address" }], name: "setPriceOracle", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "_roundId", type: "uint256" }, { internalType: "uint256", name: "_endPrice", type: "uint256" }], name: "settleRound", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "_startPrice", type: "uint256" }], name: "startRound", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "newOwner", type: "address" }], name: "transferOwnership", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "", type: "address" }, { internalType: "uint256", name: "", type: "uint256" }], name: "userBetIds", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "", type: "address" }], name: "userStats", outputs: [{ internalType: "uint256", name: "totalBets", type: "uint256" }, { internalType: "uint256", name: "totalWins", type: "uint256" }, { internalType: "uint256", name: "totalLosses", type: "uint256" }, { internalType: "uint256", name: "totalStaked", type: "uint256" }, { internalType: "uint256", name: "totalProfits", type: "uint256" }, { internalType: "uint256", name: "currentStreak", type: "uint256" }, { internalType: "uint256", name: "lastPlayedDay", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "_to", type: "address" }, { internalType: "uint256", name: "_amount", type: "uint256" }], name: "withdrawHouseProfits", outputs: [], stateMutability: "nonpayable", type: "function" }
] as const;

export const ERC20_ABI = [
  { inputs: [{ internalType: "address", name: "spender", type: "address" }, { internalType: "uint256", name: "amount", type: "uint256" }], name: "approve", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "account", type: "address" }], name: "balanceOf", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "owner", type: "address" }, { internalType: "address", name: "spender", type: "address" }], name: "allowance", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "decimals", outputs: [{ internalType: "uint8", name: "", type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "symbol", outputs: [{ internalType: "string", name: "", type: "string" }], stateMutability: "view", type: "function" }
] as const;

// Direction enum matching the contract (None=0, Up=1, Down=2)
export enum Direction {
  None = 0,
  Up = 1,
  Down = 2
}

// BetResult enum matching the contract
export enum BetResult {
  Pending = 0,
  Win = 1,
  Lose = 2
}

export interface Round {
  roundId: bigint;
  startTime: bigint;
  endTime: bigint;
  startPrice: bigint;
  endPrice: bigint;
  totalUpPool: bigint;
  totalDownPool: bigint;
  result: Direction;
  resolved: boolean;
}

export interface UserStats {
  totalBets: bigint;
  totalWins: bigint;
  totalLosses: bigint;
  totalStaked: bigint;
  totalProfits: bigint;
  currentStreak: bigint;
  lastPlayedDay: bigint;
}

export interface Bet {
  betId: bigint;
  roundId: bigint;
  user: string;
  direction: Direction;
  amount: bigint;
  timestamp: bigint;
  result: BetResult;
  payout: bigint;
}
