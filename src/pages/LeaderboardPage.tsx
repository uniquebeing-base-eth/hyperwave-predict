import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy, TrendingUp, Medal, Flame, Users, Share2, RefreshCw, Clock } from "lucide-react";
import { useAccount } from "wagmi";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useFarcasterShare } from "@/hooks/useFarcasterShare";
import { useFarcaster } from "@/contexts/FarcasterContext";

interface FarcasterProfile {
  address: string;
  fid: number | null;
  username: string | null;
  displayName: string | null;
  pfpUrl: string | null;
}

interface LeaderboardEntry {
  wallet_address: string;
  total_bets: number;
  total_wins: number;
  total_losses: number;
  win_rate: number;
  staked: number;
  payout: number;
  profit: number;
  rank: number;
  profile?: FarcasterProfile;
}

type TimeframePeriod = '24h' | '7d' | '30d';

const LeaderboardPage = () => {
  const { address } = useAccount();
  const { shareLeaderboard } = useFarcasterShare();
  const { isInMiniApp } = useFarcaster();
  
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [farcasterProfiles, setFarcasterProfiles] = useState<Map<string, FarcasterProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState<TimeframePeriod>('30d');

  const fetchLeaderboardData = async (period: TimeframePeriod) => {
    try {
      setLoading(true);
      
      // Call the RPC function
      const { data, error } = await supabase.rpc('get_leaderboard', { period });

      if (error) {
        console.error("Error fetching leaderboard:", error);
        return;
      }

      if (data && data.length > 0) {
        const rankedEntries: LeaderboardEntry[] = data.map((entry: any, idx: number) => ({
          ...entry,
          rank: idx + 1,
        }));
        
        setEntries(rankedEntries);

        // Fetch Farcaster profiles for addresses
        const addresses = rankedEntries.map(e => e.wallet_address).filter(Boolean);
        
        if (addresses.length > 0) {
          try {
            const { data: fcData, error: fcError } = await supabase.functions.invoke('get-farcaster-profiles', {
              body: { addresses }
            });
            
            if (!fcError && fcData?.profiles) {
              const profilesMap = new Map<string, FarcasterProfile>();
              for (const profile of fcData.profiles) {
                profilesMap.set(profile.address.toLowerCase(), profile);
              }
              setFarcasterProfiles(profilesMap);
            }
          } catch (err) {
            console.error("Error fetching Farcaster profiles:", err);
          }
        }
      } else {
        setEntries([]);
      }
    } catch (error) {
      console.error("Error fetching leaderboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboardData(timeframe);
  }, [timeframe]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLeaderboardData(timeframe);
  };

  const handleTimeframeChange = (period: TimeframePeriod) => {
    setTimeframe(period);
  };

  // Sort by wins
  const winLeaderboard = useMemo((): LeaderboardEntry[] => {
    return entries
      .sort((a, b) => b.total_wins - a.total_wins)
      .map((entry, idx) => ({
        ...entry,
        rank: idx + 1,
        profile: farcasterProfiles.get(entry.wallet_address.toLowerCase()),
      }));
  }, [entries, farcasterProfiles]);

  // Sort by win rate (minimum 3 bets for this leaderboard)
  const winRateLeaderboard = useMemo((): LeaderboardEntry[] => {
    return entries
      .filter(e => e.total_bets >= 3)
      .sort((a, b) => b.win_rate - a.win_rate)
      .map((entry, idx) => ({
        ...entry,
        rank: idx + 1,
        profile: farcasterProfiles.get(entry.wallet_address.toLowerCase()),
      }));
  }, [entries, farcasterProfiles]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-muted-foreground text-sm font-medium">{rank}</span>;
  };

  const handleSharePosition = async (entry: LeaderboardEntry, type: 'wins' | 'winrate') => {
    const value = type === 'wins' 
      ? `${entry.total_wins}`
      : `${entry.win_rate.toFixed(1)}%`;
    
    await shareLeaderboard({
      rank: entry.rank,
      type: type === 'wins' ? 'wins' : 'profit',
      value,
    });
  };

  const isCurrentUser = (entryAddress: string) => {
    return address?.toLowerCase() === entryAddress.toLowerCase();
  };

  const getDisplayName = (entry: LeaderboardEntry) => {
    if (entry.profile?.displayName) return entry.profile.displayName;
    if (entry.profile?.username) return `@${entry.profile.username}`;
    return `Player ${entry.rank}`;
  };

  const TimeframeSelector = () => (
    <div className="flex items-center justify-center gap-2 mb-4">
      {(['24h', '7d', '30d'] as TimeframePeriod[]).map((period) => (
        <Button
          key={period}
          size="sm"
          variant={timeframe === period ? "default" : "outline"}
          onClick={() => handleTimeframeChange(period)}
          className="flex items-center gap-1"
        >
          <Clock className="w-3 h-3" />
          {period}
        </Button>
      ))}
    </div>
  );

  const LeaderboardList = ({ entries: listEntries, type }: { entries: LeaderboardEntry[], type: 'wins' | 'winrate' }) => {
    if (loading) {
      return (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      );
    }

    if (listEntries.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No players yet for this period. Be the first!</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {listEntries.slice(0, 20).map((entry, idx) => (
          <motion.div
            key={entry.wallet_address}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className={`p-4 glass border-border/30 ${
              entry.rank <= 3 ? 'border-primary/50 bg-primary/5' : ''
            } ${isCurrentUser(entry.wallet_address) ? 'ring-2 ring-primary/50 bg-primary/10' : ''}`}>
              <div className="flex items-center justify-between gap-3">
                {/* Left: Rank + Avatar + Name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 flex justify-center shrink-0">
                    {getRankIcon(entry.rank)}
                  </div>
                  
                  {/* Profile Picture */}
                  {entry.profile?.username ? (
                    <a 
                      href={`https://warpcast.com/${entry.profile.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                    >
                      <Avatar className="w-12 h-12 border-2 border-primary/30 ring-2 ring-background shadow-lg hover:border-primary transition-colors">
                        {entry.profile?.pfpUrl ? (
                          <AvatarImage 
                            src={entry.profile.pfpUrl} 
                            alt={entry.profile.username}
                            className="object-cover"
                          />
                        ) : null}
                        <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 text-primary font-bold text-sm">
                          {entry.profile?.username?.slice(0, 2).toUpperCase() || '??'}
                        </AvatarFallback>
                      </Avatar>
                    </a>
                  ) : (
                    <Avatar className="w-12 h-12 border-2 border-muted/50 ring-2 ring-background shadow-lg shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-muted/50 to-muted/20 text-muted-foreground font-bold text-sm">
                        P{entry.rank}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  {/* Name and Stats */}
                  <div className="flex-1 min-w-0">
                    {entry.profile?.username ? (
                      <a 
                        href={`https://warpcast.com/${entry.profile.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-sm hover:text-primary transition-colors truncate block"
                      >
                        {getDisplayName(entry)}
                      </a>
                    ) : (
                      <p className="font-medium text-sm text-muted-foreground truncate">
                        Player {entry.rank}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      {entry.profile?.username && (
                        <>
                          <span className="text-primary/70">@{entry.profile.username}</span>
                          <span className="text-muted-foreground/40">•</span>
                        </>
                      )}
                      <span>{entry.total_bets} bets</span>
                      <span className="text-muted-foreground/40">•</span>
                      <span className="text-green-500">{entry.total_wins}W</span>
                      <span className="text-red-400">{entry.total_losses}L</span>
                      {entry.win_rate > 50 && (
                        <>
                          <span className="text-muted-foreground/40">•</span>
                          <span className="flex items-center gap-0.5 text-orange-400">
                            <Flame className="w-3 h-3" />
                            {entry.win_rate.toFixed(0)}%
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Right: Score + Share */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    {type === 'wins' ? (
                      <p className="text-xl font-bold text-primary">{entry.total_wins}</p>
                    ) : (
                      <p className="text-xl font-bold text-green-400">
                        {entry.win_rate.toFixed(1)}%
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {type === 'wins' ? 'wins' : 'win rate'}
                    </p>
                  </div>
                  
                  {/* Share button - ONLY for current user */}
                  {isInMiniApp && isCurrentUser(entry.wallet_address) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-primary"
                      onClick={() => handleSharePosition(entry, type)}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                  )}
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
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="w-6 h-6 text-primary" />
              Leaderboard
            </h1>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {entries.length} player{entries.length !== 1 ? 's' : ''} in {timeframe}
          </p>
        </div>

        <TimeframeSelector />

        <Tabs defaultValue="wins" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="wins" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Most Wins
            </TabsTrigger>
            <TabsTrigger value="winrate" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Best Win Rate
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="wins">
            <LeaderboardList entries={winLeaderboard} type="wins" />
          </TabsContent>
          
          <TabsContent value="winrate">
            <LeaderboardList entries={winRateLeaderboard} type="winrate" />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default LeaderboardPage;
