import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

export {
  BLOOM_BETTING_ADDRESS,
  BLOOM_TOKEN_ADDRESS,
  BLOOM_BETTING_ABI,
  ERC20_ABI,
  Direction,
} from "@/contracts/BloomBetting";

/** Lazily created so module import stays side-effect free. */
export function publicClient() {
  return createPublicClient({ chain: base, transport: http("https://mainnet.base.org") });
}

export const BLOOM_DECIMALS = 18;

/** Contract prices use 8 decimals. */
export function formatPrice8(value: bigint): number {
  return Number(value) / 1e8;
}

export function formatBloom(value: bigint): number {
  return Number(value) / 1e18;
}

export function directionLabel(value: number): "up" | "down" | "none" {
  return value === 1 ? "up" : value === 2 ? "down" : "none";
}
