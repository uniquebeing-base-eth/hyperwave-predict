import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WinShareParams {
  type: 'win';
  amount: string;
  prediction: 'up' | 'down';
  payout: string;
}

interface StatsShareParams {
  type: 'stats';
  totalPlays: string;
  winRate: string;
  streak: string;
}

interface LeaderboardShareParams {
  type: 'leaderboard';
  rank: string;
  category: 'wins' | 'profit';
  value: string;
}

function generateWinSVG(amount: string, prediction: string, payout: string): string {
  const isUp = prediction === 'up';
  const primaryColor = isUp ? '#22c55e' : '#ef4444';
  const emoji = isUp ? '📈' : '📉';
  const formattedPayout = Number(payout).toLocaleString();
  
  return `<?xml version="1.0" encoding="UTF-8"?>
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0a0a0f"/>
          <stop offset="50%" style="stop-color:#1a1a2e"/>
          <stop offset="100%" style="stop-color:#0a0a0f"/>
        </linearGradient>
        <linearGradient id="glow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${primaryColor};stop-opacity:0.4"/>
          <stop offset="100%" style="stop-color:${primaryColor};stop-opacity:0"/>
        </linearGradient>
        <filter id="textGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <rect width="1200" height="630" fill="url(#bg)"/>
      <ellipse cx="600" cy="250" rx="400" ry="200" fill="url(#glow)"/>
      
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff" stroke-width="0.5" opacity="0.05"/>
      </pattern>
      <rect width="1200" height="630" fill="url(#grid)"/>
      
      <text x="600" y="80" font-family="system-ui, sans-serif" font-size="28" fill="#8B5CF6" text-anchor="middle" font-weight="bold">⚡ HYPERWAVE</text>
      
      <text x="600" y="180" font-family="system-ui, sans-serif" font-size="56" fill="#ffffff" text-anchor="middle" font-weight="bold" filter="url(#textGlow)">I JUST WON! 🎉</text>
      
      <text x="600" y="300" font-family="system-ui, sans-serif" font-size="96" fill="${primaryColor}" text-anchor="middle" font-weight="bold" filter="url(#textGlow)">+${formattedPayout}</text>
      <text x="600" y="360" font-family="system-ui, sans-serif" font-size="36" fill="#a1a1aa" text-anchor="middle">$BLOOM</text>
      
      <rect x="450" y="400" width="300" height="60" rx="30" fill="${primaryColor}" opacity="0.2"/>
      <rect x="450" y="400" width="300" height="60" rx="30" fill="none" stroke="${primaryColor}" stroke-width="2"/>
      <text x="600" y="442" font-family="system-ui, sans-serif" font-size="28" fill="${primaryColor}" text-anchor="middle" font-weight="bold">${emoji} Predicted ${prediction.toUpperCase()}</text>
      
      <text x="600" y="540" font-family="system-ui, sans-serif" font-size="24" fill="#71717a" text-anchor="middle">Think you can beat me? Play now!</text>
      <text x="600" y="580" font-family="system-ui, sans-serif" font-size="20" fill="#8B5CF6" text-anchor="middle">hyperwavex.xyz</text>
    </svg>
  `;
}

function generateStatsSVG(totalPlays: string, winRate: string, streak: string): string {
  const streakNum = Number(streak);
  const winRateNum = Number(winRate);
  const streakEmoji = streakNum >= 7 ? '🔥🔥🔥' : streakNum >= 3 ? '🔥🔥' : streakNum > 0 ? '🔥' : '❄️';
  const winRateColor = winRateNum >= 60 ? '#22c55e' : winRateNum >= 40 ? '#eab308' : '#ef4444';
  
  return `<?xml version="1.0" encoding="UTF-8"?>
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0a0a0f"/>
          <stop offset="50%" style="stop-color:#1a1a2e"/>
          <stop offset="100%" style="stop-color:#0a0a0f"/>
        </linearGradient>
        <linearGradient id="purpleGlow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#8B5CF6;stop-opacity:0.3"/>
          <stop offset="100%" style="stop-color:#8B5CF6;stop-opacity:0"/>
        </linearGradient>
        <filter id="textGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <rect width="1200" height="630" fill="url(#bg)"/>
      <ellipse cx="600" cy="200" rx="500" ry="250" fill="url(#purpleGlow)"/>
      
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff" stroke-width="0.5" opacity="0.05"/>
      </pattern>
      <rect width="1200" height="630" fill="url(#grid)"/>
      
      <text x="600" y="70" font-family="system-ui, sans-serif" font-size="28" fill="#8B5CF6" text-anchor="middle" font-weight="bold">⚡ HYPERWAVE</text>
      
      <text x="600" y="150" font-family="system-ui, sans-serif" font-size="48" fill="#ffffff" text-anchor="middle" font-weight="bold" filter="url(#textGlow)">Check Out My Stats! 📊</text>
      
      <rect x="100" y="200" width="300" height="160" rx="20" fill="#1f1f2e" stroke="#3f3f5c" stroke-width="2"/>
      <text x="250" y="260" font-family="system-ui, sans-serif" font-size="24" fill="#71717a" text-anchor="middle">🎮 Total Plays</text>
      <text x="250" y="320" font-family="system-ui, sans-serif" font-size="56" fill="#ffffff" text-anchor="middle" font-weight="bold">${totalPlays}</text>
      
      <rect x="450" y="200" width="300" height="160" rx="20" fill="#1f1f2e" stroke="#3f3f5c" stroke-width="2"/>
      <text x="600" y="260" font-family="system-ui, sans-serif" font-size="24" fill="#71717a" text-anchor="middle">🏆 Win Rate</text>
      <text x="600" y="320" font-family="system-ui, sans-serif" font-size="56" fill="${winRateColor}" text-anchor="middle" font-weight="bold">${winRate}%</text>
      
      <rect x="800" y="200" width="300" height="160" rx="20" fill="#1f1f2e" stroke="#3f3f5c" stroke-width="2"/>
      <text x="950" y="260" font-family="system-ui, sans-serif" font-size="24" fill="#71717a" text-anchor="middle">${streakEmoji} Streak</text>
      <text x="950" y="320" font-family="system-ui, sans-serif" font-size="56" fill="#f97316" text-anchor="middle" font-weight="bold">${streak}</text>
      
      <rect x="350" y="420" width="500" height="70" rx="35" fill="#8B5CF6" opacity="0.2"/>
      <rect x="350" y="420" width="500" height="70" rx="35" fill="none" stroke="#8B5CF6" stroke-width="2"/>
      <text x="600" y="465" font-family="system-ui, sans-serif" font-size="28" fill="#8B5CF6" text-anchor="middle" font-weight="bold">Think you can beat me? 👀</text>
      
      <text x="600" y="550" font-family="system-ui, sans-serif" font-size="24" fill="#71717a" text-anchor="middle">Play now on HyperWave</text>
      <text x="600" y="590" font-family="system-ui, sans-serif" font-size="20" fill="#8B5CF6" text-anchor="middle">hyperwavex.xyz</text>
    </svg>
  `;
}

function generateLeaderboardSVG(rank: string, category: string, value: string): string {
  const rankNum = Number(rank);
  const rankEmoji = rankNum === 1 ? '🥇' : rankNum === 2 ? '🥈' : rankNum === 3 ? '🥉' : '🏅';
  const categoryEmoji = category === 'wins' ? '🏆' : '💰';
  const categoryLabel = category === 'wins' ? 'WINS' : 'PROFIT';
  
  return `<?xml version="1.0" encoding="UTF-8"?>
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0a0a0f"/>
          <stop offset="50%" style="stop-color:#1a1a2e"/>
          <stop offset="100%" style="stop-color:#0a0a0f"/>
        </linearGradient>
        <linearGradient id="gold" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#fbbf24;stop-opacity:0.4"/>
          <stop offset="100%" style="stop-color:#fbbf24;stop-opacity:0"/>
        </linearGradient>
        <filter id="textGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <rect width="1200" height="630" fill="url(#bg)"/>
      <ellipse cx="600" cy="300" rx="350" ry="200" fill="url(#gold)"/>
      
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff" stroke-width="0.5" opacity="0.05"/>
      </pattern>
      <rect width="1200" height="630" fill="url(#grid)"/>
      
      <text x="600" y="70" font-family="system-ui, sans-serif" font-size="28" fill="#8B5CF6" text-anchor="middle" font-weight="bold">⚡ HYPERWAVE LEADERBOARD</text>
      
      <text x="600" y="180" font-family="system-ui, sans-serif" font-size="72" fill="#ffffff" text-anchor="middle" font-weight="bold" filter="url(#textGlow)">${rankEmoji} RANK #${rank}</text>
      
      <rect x="400" y="220" width="400" height="60" rx="30" fill="#fbbf24" opacity="0.2"/>
      <rect x="400" y="220" width="400" height="60" rx="30" fill="none" stroke="#fbbf24" stroke-width="2"/>
      <text x="600" y="262" font-family="system-ui, sans-serif" font-size="28" fill="#fbbf24" text-anchor="middle" font-weight="bold">${categoryEmoji} TOP ${categoryLabel}</text>
      
      <text x="600" y="380" font-family="system-ui, sans-serif" font-size="96" fill="#22c55e" text-anchor="middle" font-weight="bold" filter="url(#textGlow)">${value}</text>
      <text x="600" y="430" font-family="system-ui, sans-serif" font-size="32" fill="#a1a1aa" text-anchor="middle">${category === 'wins' ? 'victories' : '$BLOOM profit'}</text>
      
      <rect x="400" y="480" width="400" height="60" rx="30" fill="#8B5CF6"/>
      <text x="600" y="520" font-family="system-ui, sans-serif" font-size="24" fill="#ffffff" text-anchor="middle" font-weight="bold">Can you climb higher? ⚡</text>
      
      <text x="600" y="590" font-family="system-ui, sans-serif" font-size="20" fill="#8B5CF6" text-anchor="middle">hyperwavex.xyz</text>
    </svg>
  `;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type');
    
    let svg: string;
    
    switch (type) {
      case 'win':
        svg = generateWinSVG(
          url.searchParams.get('amount') || '0',
          url.searchParams.get('prediction') || 'up',
          url.searchParams.get('payout') || '0'
        );
        break;
      case 'stats':
        svg = generateStatsSVG(
          url.searchParams.get('totalPlays') || '0',
          url.searchParams.get('winRate') || '0',
          url.searchParams.get('streak') || '0'
        );
        break;
      case 'leaderboard':
        svg = generateLeaderboardSVG(
          url.searchParams.get('rank') || '1',
          url.searchParams.get('category') || 'wins',
          url.searchParams.get('value') || '0'
        );
        break;
      default:
        throw new Error('Invalid share type. Use type=win, type=stats, or type=leaderboard');
    }
    
    return new Response(svg, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating share image:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
