import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy, TrendingUp, Medal, Flame, Users } from "lucide-react";
import { formatUnits } from "viem";
import { ethers } from "ethers";
import { BLOOM_BETTING_ABI, BLOOM_BETTING_ADDRESS, UserStats } from "@/contracts/BloomBetting";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

interface FarcasterProfile {
  address: string;
  fid: number | null;
  username: string | null;
  displayName: string | null;
  pfpUrl: string | null;
}

interface LeaderboardEntry {
  address: string;
  stats: UserStats;
  rank: number;
  profile?: FarcasterProfile;
}

const LeaderboardPage = () => {
  const [players, setPlayers] = useState<string[]>([]);
  const [playerStats, setPlayerStats] = useState<Map<string, UserStats>>(new Map());
  const [playerProfiles, setPlayerProfiles] = useState<Map<string, FarcasterProfile>>(new Map());
  const [loading, setLoading] = useState(true);

  // Fetch all unique players from BetPlaced events
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        
        const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
        const contract = new ethers.Contract(BLOOM_BETTING_ADDRESS, BLOOM_BETTING_ABI, provider);
        
        // Get BetPlaced events to find all players
        const filter = contract.filters.BetPlaced();
        const logs = await contract.queryFilter(filter, -50000); // Last 50k blocks
        
        // Extract unique addresses
        const uniquePlayers = [...new Set(logs.map(log => {
          const parsed = contract.interface.parseLog({ topics: log.topics as string[], data: log.data });
          return parsed?.args?.user as string;
        }).filter(Boolean))];
        
        setPlayers(uniquePlayers);

        // Fetch stats for each player
        const statsMap = new Map<string, UserStats>();
        
        for (const player of uniquePlayers) {
          try {
            const stats = await contract.getUserStats(player);
            statsMap.set(player, {
              totalBets: stats.totalBets,
              totalWins: stats.totalWins,
              totalLosses: stats.totalLosses,
              totalStaked: stats.totalStaked,
              totalProfits: stats.totalProfits,
              currentStreak: stats.currentStreak,
              lastPlayedDay: stats.lastPlayedDay,
            });
          } catch (err) {
            console.error(`Error fetching stats for ${player}:`, err);
          }
        }
        
        setPlayerStats(statsMap);
        
        // Fetch Farcaster profiles for all players
        if (uniquePlayers.length > 0) {
          try {
            const { data, error } = await supabase.functions.invoke('get-farcaster-profiles', {
              body: { addresses: uniquePlayers }
            });
            
            if (!error && data?.profiles) {
              const profilesMap = new Map<string, FarcasterProfile>();
              for (const profile of data.profiles) {
                profilesMap.set(profile.address.toLowerCase(), profile);
              }
              setPlayerProfiles(profilesMap);
            }
          } catch (err) {
            console.error("Error fetching Farcaster profiles:", err);
          }
        }
      } catch (error) {
        console.error("Error fetching leaderboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  // Sort by wins
  const winLeaderboard = useMemo((): LeaderboardEntry[] => {
    return players
      .map(address => ({
        address,
        stats: playerStats.get(address) || {
          totalBets: 0n,
          totalWins: 0n,
          totalLosses: 0n,
          totalStaked: 0n,
          totalProfits: 0n,
          currentStreak: 0n,
          lastPlayedDay: 0n,
        },
        rank: 0,
        profile: playerProfiles.get(address.toLowerCase()),
      }))
      .filter(entry => entry.stats.totalBets > 0n)
      .sort((a, b) => Number(b.stats.totalWins - a.stats.totalWins))
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
  }, [players, playerStats, playerProfiles]);

  // Sort by profit
  const profitLeaderboard = useMemo((): LeaderboardEntry[] => {
    return players
      .map(address => ({
        address,
        stats: playerStats.get(address) || {
          totalBets: 0n,
          totalWins: 0n,
          totalLosses: 0n,
          totalStaked: 0n,
          totalProfits: 0n,
          currentStreak: 0n,
          lastPlayedDay: 0n,
        },
        rank: 0,
        profile: playerProfiles.get(address.toLowerCase()),
      }))
      .filter(entry => entry.stats.totalBets > 0n)
      .sort((a, b) => Number(b.stats.totalProfits - a.stats.totalProfits))
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
  }, [players, playerStats, playerProfiles]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatProfit = (profit: bigint) => {
    const value = Number(formatUnits(profit, 18));
    return value >= 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-muted-foreground text-sm">{rank}</span>;
  };

  const LeaderboardList = ({ entries, type }: { entries: LeaderboardEntry[], type: 'wins' | 'profit' }) => {
    if (loading) {
      return (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      );
    }

    if (entries.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No players yet. Be the first!</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {entries.slice(0, 20).map((entry, idx) => (
          <motion.div
            key={entry.address}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className={`p-4 glass border-border/30 ${
              entry.rank <= 3 ? 'border-primary/50 bg-primary/5' : ''
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 flex justify-center">
                    {getRankIcon(entry.rank)}
                  </div>
                  <Avatar className="w-10 h-10 border border-border/50">
                    {entry.profile?.pfpUrl ? (
                      <AvatarImage src={entry.profile.pfpUrl} alt={entry.profile.username || 'Player'} />
                    ) : null}
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {entry.address.slice(2, 4).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    {entry.profile?.username ? (
                      <p className="font-medium text-sm">
                        {entry.profile.displayName || `@${entry.profile.username}`}
                      </p>
                    ) : (
                      <p className="font-mono text-sm">{formatAddress(entry.address)}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {entry.profile?.username && (
                        <span className="text-primary/70">@{entry.profile.username}</span>
                      )}
                      <span>{Number(entry.stats.totalBets)} bets</span>
                      {entry.stats.currentStreak > 0n && (
                        <span className="flex items-center gap-1 text-orange-400">
                          <Flame className="w-3 h-3" />
                          {Number(entry.stats.currentStreak)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {type === 'wins' ? (
                    <p className="text-lg font-bold text-primary">{Number(entry.stats.totalWins)}</p>
                  ) : (
                    <p className={`text-lg font-bold ${
                      entry.stats.totalProfits >= 0n ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatProfit(entry.stats.totalProfits)}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {type === 'wins' ? 'wins' : 'BLOOM'}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-24 pt-4">
      <motion.div
        className="px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
            <Trophy className="w-6 h-6 text-primary" />
            Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Top {players.length} players on-chain
          </p>
        </div>

        <Tabs defaultValue="wins" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="wins" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Most Wins
            </TabsTrigger>
            <TabsTrigger value="profit" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Top Profit
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="wins">
            <LeaderboardList entries={winLeaderboard} type="wins" />
          </TabsContent>
          
          <TabsContent value="profit">
            <LeaderboardList entries={profitLeaderboard} type="profit" />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default LeaderboardPage;
