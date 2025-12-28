import { createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { fallback } from 'viem';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [farcasterMiniApp()],
  transports: {
    [base.id]: fallback([http('https://mainnet.base.org')]),
  },
  ssr: true,
});

// Re-export contract addresses and ABIs
export { 
  BLOOM_BETTING_ADDRESS, 
  BLOOM_TOKEN_ADDRESS, 
  BLOOM_BETTING_ABI, 
  ERC20_ABI,
  Direction,
  BetResult
} from '@/contracts/BloomBetting';

export type { Round, UserStats, Bet } from '@/contracts/BloomBetting';
