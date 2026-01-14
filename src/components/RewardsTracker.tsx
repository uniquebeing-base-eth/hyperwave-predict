import { motion } from "framer-motion";
import { Vault, Clock, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RewardsTrackerProps {
  totalRewards: number;
  daysPlayed: number;
  canClaim: boolean;
  onClaim?: () => void;
}

const RewardsTracker = ({
  totalRewards,
  daysPlayed,
  canClaim,
  onClaim,
}: RewardsTrackerProps) => {
  const daysRequired = 7;
  const progressPercentage = Math.min((daysPlayed / daysRequired) * 100, 100);
  const multiplier = canClaim ? 2 : 1;
  const daysToUnlock = daysRequired - daysPlayed;

  return (
    <motion.div
      className="glass rounded-2xl p-5 relative overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Glow effect when multiplier unlocked */}
      {canClaim && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-accent/20 via-primary/20 to-accent/20"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Header */}
      <div className="relative flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-accent/20">
            <Vault className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="font-display font-bold text-foreground">Phase Vault</h3>
            <p className="text-xs text-muted-foreground">Your phase earnings</p>
          </div>
        </div>
        {/* Multiplier Badge */}
        <motion.div
          className={`px-3 py-1.5 rounded-full font-display font-bold text-sm ${
            canClaim 
              ? 'bg-gradient-accent text-white shadow-[0_0_15px_hsl(var(--accent)/0.5)]' 
              : 'bg-muted text-muted-foreground'
          }`}
          animate={canClaim ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {multiplier}x
        </motion.div>
      </div>

      {/* Vault Amount */}
      <div className="relative text-center mb-5 py-4 rounded-xl bg-muted/30">
        <motion.p
          className="text-4xl font-display font-bold text-primary text-glow-primary"
          animate={canClaim ? { scale: [1, 1.02, 1] } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {totalRewards.toLocaleString()}
        </motion.p>
        <p className="text-sm text-muted-foreground mt-1">$BLOOM</p>
        
        {/* Multiplier unlocked message */}
        {canClaim && (
          <motion.div 
            className="mt-2 flex items-center justify-center gap-1 text-accent"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Multiplier unlocked: 2x</span>
          </motion.div>
        )}
      </div>

      {/* Streak Progress */}
      <div className="relative mb-5">
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Streak Progress</span>
          </div>
          <span className="font-display">{daysPlayed}/{daysRequired} days</span>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${canClaim ? 'bg-gradient-accent' : 'bg-gradient-primary'}`}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{
              boxShadow: canClaim 
                ? "0 0 15px hsl(var(--accent) / 0.6)" 
                : "0 0 10px hsl(var(--primary) / 0.4)",
            }}
          />
        </div>

        {/* Day markers with visual streak */}
        <div className="flex justify-between mt-3">
          {Array.from({ length: daysRequired }).map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              <motion.div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${i < daysPlayed 
                    ? 'bg-primary text-white border border-primary/60 shadow-[0_0_10px_hsl(var(--primary)/0.5)]' 
                    : i === daysPlayed 
                      ? 'bg-muted/50 border-2 border-primary/50 text-primary'
                      : 'bg-muted/30 border border-muted text-muted-foreground'
                  }`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 * i }}
              >
                {i + 1}
              </motion.div>
              {i === 6 && (
                <span className="text-[10px] text-accent mt-1">2x</span>
              )}
            </div>
          ))}
        </div>

        {/* Days to unlock message */}
        {!canClaim && daysToUnlock > 0 && (
          <motion.p 
            className="text-center text-xs text-primary mt-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Zap className="w-3 h-3 inline mr-1" />
            {daysToUnlock} day{daysToUnlock > 1 ? 's' : ''} left to unlock 2x rewards
          </motion.p>
        )}
      </div>

      {/* Claim Button */}
      <Button
        variant={canClaim ? "neon" : "outline"}
        size="lg"
        className="w-full relative overflow-hidden"
        disabled={!canClaim}
        onClick={onClaim}
      >
        {canClaim && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
          />
        )}
        <span className="relative z-10">
          {canClaim ? "Claim Rewards" : "Withdraw Anytime"}
        </span>
      </Button>

      {/* Info text */}
      <p className="text-center text-xs text-muted-foreground mt-3">
        {canClaim 
          ? "Congrats! Your 2x multiplier is active." 
          : "Maintain a 7-day streak to double your Phase Vault"
        }
      </p>
    </motion.div>
  );
};

export default RewardsTracker;
