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

/** Loosely typed contract read (viem's generic inference is too strict for dynamic tool code). */
export async function readBetting(functionName: string, args: unknown[] = []): Promise<any> {
  const client = publicClient() as any;
  const { BLOOM_BETTING_ABI, BLOOM_BETTING_ADDRESS } = await import("@/contracts/BloomBetting");
  return client.readContract({
    address: BLOOM_BETTING_ADDRESS,
    abi: BLOOM_BETTING_ABI,
    functionName,
    args,
  });
}

/** Loosely typed ERC20 read. */
export async function readToken(functionName: string, args: unknown[] = []): Promise<any> {
  const client = publicClient() as any;
  const { BLOOM_TOKEN_ADDRESS, ERC20_ABI } = await import("@/contracts/BloomBetting");
  return client.readContract({
    address: BLOOM_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName,
    args,
  });
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
