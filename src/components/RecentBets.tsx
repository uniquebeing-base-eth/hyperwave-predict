import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Clock } from "lucide-react";

interface Bet {
  id: string;
  direction: "up" | "down";
  amount: number;
  result: "win" | "lose" | "pending";
  timestamp: Date;
}

interface RecentBetsProps {
  bets: Bet[];
}

const RecentBets = ({ bets }: RecentBetsProps) => {
  return (
    <motion.div
      className="glass rounded-2xl p-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-display uppercase tracking-wider text-muted-foreground">
          Recent Bets
        </h3>
        <Clock className="w-4 h-4 text-muted-foreground" />
      </div>

      {bets.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm">No bets placed yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Place your first prediction!
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {bets.map((bet, index) => (
            <motion.div
              key={bet.id}
              className={`flex items-center justify-between p-3 rounded-lg ${
                bet.result === "win"
                  ? "bg-success/10 border border-success/20"
                  : bet.result === "lose"
                  ? "bg-danger/10 border border-danger/20"
                  : "bg-muted/30 border border-border"
              }`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    bet.direction === "up" ? "bg-success/20" : "bg-danger/20"
                  }`}
                >
                  {bet.direction === "up" ? (
                    <TrendingUp className="w-4 h-4 text-success" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-danger" />
                  )}
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground">
                    {bet.amount} ETH
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {bet.direction.toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span
                  className={`text-sm font-display font-semibold ${
                    bet.result === "win"
                      ? "text-success"
                      : bet.result === "lose"
                      ? "text-danger"
                      : "text-muted-foreground"
                  }`}
                >
                  {bet.result === "win"
                    ? `+${bet.amount * 2}`
                    : bet.result === "lose"
                    ? `-${bet.amount}`
                    : "Pending..."}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default RecentBets;
