
import { motion } from "framer-motion";
import { Wallet, Trophy, Target, Flame, Coins, Share2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFarcasterShare } from "@/hooks/useFarcasterShare";
import { useFarcaster } from "@/contexts/FarcasterContext";

interface UserStatsProps {
  ethBalance: number;
  bloomBalance: number;
  totalBets: number;
  wins: number;
  streak: number;
  percentile?: number;
  vaultAmount?: number;
}

const UserStats = ({ 
  ethBalance, 
  bloomBalance, 
  totalBets, 
  wins, 
  streak,
  percentile = 0,
  vaultAmount = 0,
}: UserStatsProps) => {
  const { shareStats } = useFarcasterShare();
  const { user, isInMiniApp } = useFarcaster();
  const winRate = totalBets > 0 ? Math.round((wins / totalBets) * 100) : 0;
  const multiplier = streak >= 7 ? 2 : 1;

  const handleShare = async () => {
    await shareStats({
      totalPlays: totalBets,
      winRate,
      streak,
      vaultAmount,
      multiplier,
    });
  };

  const stats = [
    {
      icon: Wallet,
      label: "ETH Balance",
      value: ethBalance.toFixed(6),
      suffix: "ETH",
      color: "text-primary",
      glow: "text-glow-primary",
    },
    {
      icon: Coins,
      label: "BLOOM Balance",
      value: bloomBalance.toLocaleString(),
      suffix: "$BLOOM",
      color: "text-accent",
      glow: "text-glow-accent",
    },
    {
      icon: Trophy,
      label: "Win Rate",
      value: winRate,
      suffix: "%",
      color: "text-success",
      glow: "text-glow-success",
    },
    {
      icon: Target,
      label: "Total Bets",
      value: totalBets,
      suffix: "",
      color: "text-foreground",
      glow: "",
    },
    {
      icon: Flame,
      label: "Streak",
      value: streak,
      suffix: streak >= 7 ? "🔥 2x" : "🔥",
      color: "text-accent",
      glow: "text-glow-accent",
    },
  ];

  return (
    <motion.div
      className="glass rounded-2xl p-5"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4 }}
    >
      <h3 className="text-sm font-display uppercase tracking-wider text-muted-foreground mb-4">
        Your Stats
      </h3>

      <div className="space-y-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </div>
            <span className={`font-display font-bold ${stat.color} ${stat.glow}`}>
              {stat.value}
              {stat.suffix && <span className="text-xs ml-1">{stat.suffix}</span>}
            </span>
          </motion.div>
        ))}

        {/* Relative Performance - Only show if we have data */}
        {percentile > 0 && (
          <motion.div
            className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9 }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Performance</p>
                <p className="text-lg font-display font-bold text-primary text-glow-primary">
                  You outperform {percentile}% of players
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Share Stats Button */}
      {isInMiniApp && (
        <motion.div
          className="mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Button 
            onClick={handleShare}
            variant="outline"
            className="w-full border-primary/30 hover:bg-primary/10"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Stats on Farcaster
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default UserStats;
