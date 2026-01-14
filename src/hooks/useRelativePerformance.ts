import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { supabase } from "@/integrations/supabase/client";

interface PerformanceData {
  percentile: number;
  totalPlayers: number;
  userRank: number;
  isLoading: boolean;
}

export const useRelativePerformance = (): PerformanceData => {
  const { address } = useAccount();
  const [percentile, setPercentile] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [userRank, setUserRank] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPerformance = async () => {
      if (!address) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch all-time leaderboard data
        const { data, error } = await supabase.rpc('get_leaderboard', { period: '30d' });

        if (error) {
          console.error("Error fetching leaderboard for percentile:", error);
          setIsLoading(false);
          return;
        }

        if (!data || data.length === 0) {
          setIsLoading(false);
          return;
        }

        // Sort by wins (same as leaderboard)
        const sorted = [...data].sort((a: any, b: any) => b.total_wins - a.total_wins);
        const total = sorted.length;
        setTotalPlayers(total);

        // Find user's position
        const userIndex = sorted.findIndex(
          (entry: any) => entry.wallet_address.toLowerCase() === address.toLowerCase()
        );

        if (userIndex === -1) {
          // User not in leaderboard yet
          setPercentile(0);
          setUserRank(0);
        } else {
          const rank = userIndex + 1;
          setUserRank(rank);
          
          // Calculate percentile (what percentage of players you outperform)
          // If you're rank 1 out of 100, you outperform 99%
          // If you're rank 50 out of 100, you outperform 50%
          const outperformPercentage = Math.round(((total - rank) / total) * 100);
          setPercentile(Math.max(0, outperformPercentage));
        }
      } catch (err) {
        console.error("Error calculating percentile:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPerformance();
  }, [address]);

  return { percentile, totalPlayers, userRank, isLoading };
};
