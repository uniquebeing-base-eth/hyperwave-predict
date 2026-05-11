export const BLOOM_REWARDS_ADDRESS = "0xf077988E175f5EeCDa4d7cbab6881Dd148E24152" as const;

export const BLOOM_REWARDS_ABI = [
  { inputs: [{ internalType: "address", name: "_bloomToken", type: "address" }, { internalType: "address", name: "_oracleSigner", type: "address" }], stateMutability: "nonpayable", type: "constructor" },
  { inputs: [], name: "InvalidSignature", type: "error" },
  { inputs: [], name: "NonceAlreadyUsed", type: "error" },
  { inputs: [], name: "NothingToClaim", type: "error" },
  { inputs: [], name: "ZeroAddress", type: "error" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "user", type: "address" }, { indexed: false, internalType: "uint256", name: "amount", type: "uint256" }, { indexed: false, internalType: "uint256", name: "nonce", type: "uint256" }], name: "Claimed", type: "event" },
  { inputs: [], name: "bloomToken", outputs: [{ internalType: "contract IERC20", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "", type: "address" }], name: "claimed", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "user", type: "address" }, { internalType: "uint256", name: "cumulativeAmount", type: "uint256" }], name: "claimable", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  {
    inputs: [
      { internalType: "uint256", name: "cumulativeAmount", type: "uint256" },
      { internalType: "uint256", name: "nonce", type: "uint256" },
      { internalType: "bytes", name: "signature", type: "bytes" },
    ],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  { inputs: [], name: "oracleSigner", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "vaultBalance", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
] as const;
