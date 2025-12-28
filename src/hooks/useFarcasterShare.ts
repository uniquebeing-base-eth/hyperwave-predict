import { sdk } from '@farcaster/miniapp-sdk';
import { toast } from 'sonner';

const APP_URL = 'https://hyperwavex.xyz';

interface ShareWinParams {
  amount: number;
  result: 'up' | 'down';
  username?: string;
}

interface ShareStatsParams {
  username: string;
  totalBets: number;
  winRate: number;
  streak: number;
}

interface ShareLeaderboardParams {
  username: string;
  rank: number;
  type: 'wins' | 'profit';
  value: string;
}

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

  const shareWin = async ({ amount, result, username }: ShareWinParams) => {
    const displayName = username || 'I';
    const emoji = result === 'up' ? '📈' : '📉';
    const text = `${emoji} ${displayName} just won ${(amount * 2).toLocaleString()} $BLOOM on @hyperwave!\n\nPredicted ${result.toUpperCase()} and crushed it! 🏆`;
    await shareToFarcaster(text);
  };

  const shareStats = async ({ username, totalBets, winRate, streak }: ShareStatsParams) => {
    const streakEmoji = streak >= 7 ? '🔥🔥🔥' : streak >= 3 ? '🔥🔥' : streak > 0 ? '🔥' : '';
    const text = `⚡ @${username}'s HyperWave Stats\n\n🎮 ${totalBets} plays\n🏆 ${winRate}% win rate\n${streak > 0 ? `${streakEmoji} ${streak} day streak` : ''}\n\nThink you can beat me? 👇`;
    await shareToFarcaster(text);
  };

  const shareLeaderboard = async ({ username, rank, type, value }: ShareLeaderboardParams) => {
    const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏅';
    const typeLabel = type === 'wins' ? 'wins' : 'profit';
    const text = `${rankEmoji} @${username} is ranked #${rank} on HyperWave!\n\n${type === 'wins' ? '🏆' : '💰'} ${value} ${typeLabel}\n\nCan you climb higher? ⚡`;
    await shareToFarcaster(text, `${APP_URL}/leaderboard`);
  };

  return {
    shareWin,
    shareStats,
    shareLeaderboard,
    shareToFarcaster,
  };
};
