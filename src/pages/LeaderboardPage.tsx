import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy, TrendingUp, Medal, Flame, Users, Share2, RefreshCw } from "lucide-react";
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

interface ProfileData {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  total_bets: number;
  total_wins: number;
  total_losses: number;
  balance: number;
  win_rate: number;
}

interface LeaderboardEntry {
  address: string;
  totalBets: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  balance: number;
  rank: number;
  profile?: FarcasterProfile;
  dbProfile?: ProfileData;
}

const LeaderboardPage = () => {
  const { address } = useAccount();
  const { shareLeaderboard } = useFarcasterShare();
  const { isInMiniApp } = useFarcaster();
  
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [farcasterProfiles, setFarcasterProfiles] = useState<Map<string, FarcasterProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderboardData = async () => {
    try {
      // Fetch profiles from database
      const { data: profilesData, error } = await supabase
        .from('profiles')
        .select('*')
        .order('total_wins', { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching profiles:", error);
        return;
      }

      if (profilesData && profilesData.length > 0) {
        setProfiles(profilesData);

        // Fetch Farcaster profiles for addresses
        const addresses = profilesData.map(p => p.id).filter(Boolean);
        
        if (addresses.length > 0) {
          try {
            const { data, error: fcError } = await supabase.functions.invoke('get-farcaster-profiles', {
              body: { addresses }
            });
            
            if (!fcError && data?.profiles) {
              const profilesMap = new Map<string, FarcasterProfile>();
              for (const profile of data.profiles) {
                profilesMap.set(profile.address.toLowerCase(), profile);
              }
              setFarcasterProfiles(profilesMap);
            }
          } catch (err) {
            console.error("Error fetching Farcaster profiles:", err);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching leaderboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchLeaderboardData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLeaderboardData();
  };

  // Sort by wins
  const winLeaderboard = useMemo((): LeaderboardEntry[] => {
    return profiles
      .filter(p => p.total_bets > 0)
      .sort((a, b) => b.total_wins - a.total_wins)
      .map((profile, idx) => ({
        address: profile.id,
        totalBets: profile.total_bets,
        totalWins: profile.total_wins,
        totalLosses: profile.total_losses,
        winRate: profile.win_rate,
        balance: profile.balance,
        rank: idx + 1,
        profile: farcasterProfiles.get(profile.id.toLowerCase()),
        dbProfile: profile,
      }));
  }, [profiles, farcasterProfiles]);

  // Sort by win rate (minimum 5 bets)
  const winRateLeaderboard = useMemo((): LeaderboardEntry[] => {
    return profiles
      .filter(p => p.total_bets >= 5)
      .sort((a, b) => b.win_rate - a.win_rate)
      .map((profile, idx) => ({
        address: profile.id,
        totalBets: profile.total_bets,
        totalWins: profile.total_wins,
        totalLosses: profile.total_losses,
        winRate: profile.win_rate,
        balance: profile.balance,
        rank: idx + 1,
        profile: farcasterProfiles.get(profile.id.toLowerCase()),
        dbProfile: profile,
      }));
  }, [profiles, farcasterProfiles]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-muted-foreground text-sm">{rank}</span>;
  };

  const handleSharePosition = async (entry: LeaderboardEntry, type: 'wins' | 'winrate') => {
    const value = type === 'wins' 
      ? `${entry.totalWins}`
      : `${entry.winRate.toFixed(1)}%`;
    
    await shareLeaderboard({
      rank: entry.rank,
      type: type === 'wins' ? 'wins' : 'profit',
      value,
    });
  };

  const isCurrentUser = (entryAddress: string) => {
    return address?.toLowerCase() === entryAddress.toLowerCase();
  };

  const LeaderboardList = ({ entries, type }: { entries: LeaderboardEntry[], type: 'wins' | 'winrate' }) => {
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
            } ${isCurrentUser(entry.address) ? 'ring-2 ring-primary/50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 flex justify-center">
                    {getRankIcon(entry.rank)}
                  </div>
                  <Avatar className="w-10 h-10 border border-border/50">
                    {(entry.profile?.pfpUrl || entry.dbProfile?.avatar_url) ? (
                      <AvatarImage 
                        src={entry.profile?.pfpUrl || entry.dbProfile?.avatar_url || undefined} 
                        alt={entry.profile?.username || entry.dbProfile?.username || 'Player'} 
                      />
                    ) : null}
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {entry.address.slice(2, 4).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    {(entry.profile?.username || entry.dbProfile?.display_name) ? (
                      <p className="font-medium text-sm">
                        {entry.profile?.displayName || entry.dbProfile?.display_name || `@${entry.profile?.username || entry.dbProfile?.username}`}
                      </p>
                    ) : (
                      <p className="font-mono text-sm">{formatAddress(entry.address)}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {(entry.profile?.username || entry.dbProfile?.username) && (
                        <span className="text-primary/70">@{entry.profile?.username || entry.dbProfile?.username}</span>
                      )}
                      <span>{entry.totalBets} bets</span>
                      {entry.winRate > 60 && (
                        <span className="flex items-center gap-1 text-orange-400">
                          <Flame className="w-3 h-3" />
                          {entry.winRate.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    {type === 'wins' ? (
                      <p className="text-lg font-bold text-primary">{entry.totalWins}</p>
                    ) : (
                      <p className="text-lg font-bold text-green-400">
                        {entry.winRate.toFixed(1)}%
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {type === 'wins' ? 'wins' : 'win rate'}
                    </p>
                  </div>
                  {isInMiniApp && isCurrentUser(entry.address) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
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
        <div className="text-center mb-6">
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
            {profiles.length} players registered
          </p>
        </div>

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
