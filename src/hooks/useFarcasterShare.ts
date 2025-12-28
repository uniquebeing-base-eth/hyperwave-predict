import { sdk } from '@farcaster/miniapp-sdk';
import { toast } from 'sonner';

const APP_URL = 'https://hyperwavex.xyz';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface ShareWinParams {
  amount: number;
  result: 'up' | 'down';
  payout: number;
}

interface ShareStatsParams {
  totalPlays: number;
  winRate: number;
  streak: number;
}

interface ShareLeaderboardParams {
  rank: number;
  type: 'wins' | 'profit';
  value: string;
}

const getShareImageUrl = (type: string, params: Record<string, string | number>) => {
  const queryParams = new URLSearchParams({ type });
  Object.entries(params).forEach(([key, value]) => {
    queryParams.set(key, String(value));
  });
  return `${SUPABASE_URL}/functions/v1/generate-share-image?${queryParams.toString()}`;
};

export const useFarcasterShare = () => {
  const shareToFarcaster = async (text: string, embedUrl?: string) => {
    try {
      await sdk.actions.composeCast({
        text,
        embeds: embedUrl ? [embedUrl] : [APP_URL],
      });
    } catch (error) {
      console.log('Share error:', error);
      // Fallback to copying text
      navigator.clipboard.writeText(`${text}\n\n${embedUrl || APP_URL}`);
      toast.success('Copied to clipboard!');
    }
  };

  const shareWin = async ({ amount, result, payout }: ShareWinParams) => {
    const emoji = result === 'up' ? '📈' : '📉';
    const text = `${emoji} I just won +${payout.toLocaleString()} $BLOOM on @hyperwave!\n\nPredicted ${result.toUpperCase()} and crushed it! 🏆\n\nThink you can beat me?`;
    
    const imageUrl = getShareImageUrl('win', {
      amount,
      prediction: result,
      payout,
    });
    
    await shareToFarcaster(text, imageUrl);
  };

  const shareStats = async ({ totalPlays, winRate, streak }: ShareStatsParams) => {
    const streakEmoji = streak >= 7 ? '🔥🔥🔥' : streak >= 3 ? '🔥🔥' : streak > 0 ? '🔥' : '';
    const text = `⚡ Check out my HyperWave stats!\n\n🎮 ${totalPlays} plays\n🏆 ${winRate}% win rate\n${streak > 0 ? `${streakEmoji} ${streak} day streak` : ''}\n\nThink you can beat me? 👇`;
    
    const imageUrl = getShareImageUrl('stats', {
      totalPlays,
      winRate,
      streak,
    });
    
    await shareToFarcaster(text, imageUrl);
  };

  const shareLeaderboard = async ({ rank, type, value }: ShareLeaderboardParams) => {
    const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏅';
    const typeLabel = type === 'wins' ? 'wins' : 'profit';
    const text = `${rankEmoji} I'm ranked #${rank} on HyperWave!\n\n${type === 'wins' ? '🏆' : '💰'} ${value} ${typeLabel}\n\nCan you climb higher? ⚡`;
    
    const imageUrl = getShareImageUrl('leaderboard', {
      rank,
      category: type,
      value,
    });
    
    await shareToFarcaster(text, imageUrl);
  };

  return {
    shareWin,
    shareStats,
    shareLeaderboard,
    shareToFarcaster,
  };
};
