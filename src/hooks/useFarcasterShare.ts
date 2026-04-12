
import { sdk } from '@farcaster/miniapp-sdk';
import { toast } from 'sonner';

const APP_URL = 'https://hyperwavex.xyz';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface SharePnlParams {
  username: string;
  result: 'win' | 'loss';
  amount: number;
  payout: number;
  prediction: 'up' | 'down';
  streak?: number;
  totalWins?: number;
  totalBets?: number;
  winRate?: number;
}

interface ShareWinParams {
  amount: number;
  result: 'up' | 'down';
  payout: number;
  streak?: number;
  vaultAmount?: number;
  multiplier?: number;
}

interface ShareStatsParams {
  totalPlays: number;
  winRate: number;
  streak: number;
  vaultAmount?: number;
  multiplier?: number;
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
  const shareToFarcaster = async (text: string, imageUrl?: string) => {
    try {
      const embeds: [string, string] | [string] = imageUrl 
        ? [imageUrl, APP_URL] 
        : [APP_URL];
      
      await sdk.actions.composeCast({
        text,
        embeds,
      });
    } catch (error) {
      console.log('Share error:', error);
      navigator.clipboard.writeText(`${text}\n\n${APP_URL}`);
      toast.success('Copied to clipboard!');
    }
  };

  const sharePnl = async ({ username, result, amount, payout, prediction, streak = 0, totalWins = 0, totalBets = 0, winRate = 0 }: SharePnlParams) => {
    const isWin = result === 'win';
    const emoji = isWin ? '🏆' : '📉';
    const pnlSign = isWin ? '+' : '-';
    const pnlAmount = isWin ? payout : amount;
    
    let text = `${emoji} ${isWin ? 'Won' : 'Lost'} ${pnlSign}${pnlAmount.toLocaleString()} $BLOOM on @hyperwave!\n\n`;
    text += `📊 ${totalWins}W / ${totalBets - totalWins}L • ${winRate.toFixed(1)}% WR`;
    if (streak > 0) text += ` • 🔥${streak}`;
    text += `\n\nThink you can do better?`;
    
    const imageUrl = getShareImageUrl('pnl', {
      username,
      result,
      amount,
      payout,
      prediction,
      streak,
      totalWins,
      totalBets,
      winRate: winRate.toFixed(1),
    });
    
    await shareToFarcaster(text, imageUrl);
  };

  const shareWin = async ({ amount, result, payout, streak = 0, vaultAmount = 0, multiplier = 1 }: ShareWinParams) => {
    const emoji = result === 'up' ? '📈' : '📉';
    const streakEmoji = streak >= 7 ? '🔥🔥🔥' : streak >= 3 ? '🔥🔥' : streak > 0 ? '🔥' : '';
    
    let text = `${emoji} I just won +${payout.toLocaleString()} $BLOOM on @hyperwave!\n\nPredicted ${result.toUpperCase()} and crushed it! 🏆`;
    
    if (streak > 0 || vaultAmount > 0) {
      text += '\n\n';
      if (streak > 0) {
        text += `${streakEmoji} ${streak}-day streak`;
        if (streak < 7) text += ` • ${7 - streak} days to 2x`;
        text += '\n';
      }
      if (vaultAmount > 0) {
        text += `💰 Phase Vault: ${vaultAmount.toLocaleString()} $BLOOM`;
        if (multiplier > 1) text += ` (${multiplier}x)`;
      }
    }
    
    text += '\n\nThink you can beat me?';
    
    const imageUrl = getShareImageUrl('win', {
      amount,
      prediction: result,
      payout,
      streak,
      vault: vaultAmount,
      multiplier,
    });
    
    await shareToFarcaster(text, imageUrl);
  };

  const shareStats = async ({ totalPlays, winRate, streak, vaultAmount = 0, multiplier = 1 }: ShareStatsParams) => {
    const streakEmoji = streak >= 7 ? '🔥🔥🔥' : streak >= 3 ? '🔥🔥' : streak > 0 ? '🔥' : '';
    
    let text = `⚡ Check out my HyperWave stats!\n\n🎮 ${totalPlays} plays\n🏆 ${winRate}% win rate`;
    
    if (streak > 0) {
      text += `\n${streakEmoji} ${streak} day streak`;
      if (streak >= 7) text += ' • 2x active!';
      else text += ` • ${7 - streak} days to 2x`;
    }
    
    if (vaultAmount > 0) {
      text += `\n💰 Phase Vault: ${vaultAmount.toLocaleString()} $BLOOM`;
      if (multiplier > 1) text += ` (${multiplier}x)`;
    }
    
    text += '\n\nThink you can beat me? 👇';
    
    const imageUrl = getShareImageUrl('stats', {
      totalPlays,
      winRate,
      streak,
      vault: vaultAmount,
      multiplier,
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
    sharePnl,
    shareWin,
    shareStats,
    shareLeaderboard,
    shareToFarcaster,
  };
};
