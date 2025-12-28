import { createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';

import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [farcasterMiniApp()],
  transports: {
    [base.id]: http(),
  },
  
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
