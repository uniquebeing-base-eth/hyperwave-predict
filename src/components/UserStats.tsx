import { motion } from "framer-motion";
import { Wallet, Trophy, Target, Flame, Coins } from "lucide-react";

interface UserStatsProps {
  ethBalance: number;
  bloomBalance: number;
  totalBets: number;
  wins: number;
  streak: number;
}

const UserStats = ({ ethBalance, bloomBalance, totalBets, wins, streak }: UserStatsProps) => {
  const winRate = totalBets > 0 ? Math.round((wins / totalBets) * 100) : 0;

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
      suffix: "🔥",
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
      </div>
    </motion.div>
  );
};

export default UserStats;
