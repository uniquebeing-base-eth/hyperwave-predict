
import { motion } from "framer-motion";
import { Gift, Clock, Sparkles } from "lucide-react";
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

  return (
    <motion.div
      className="glass rounded-2xl p-5 relative overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Glow effect when claimable */}
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
            <Gift className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="font-display font-bold text-foreground">Total Rewards</h3>
            <p className="text-xs text-muted-foreground">Play daily to claim</p>
          </div>
        </div>
        {canClaim && (
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
          >
            <Sparkles className="w-5 h-5 text-accent" />
          </motion.div>
        )}
      </div>

      {/* Rewards Amount */}
      <div className="relative text-center mb-5 py-4 rounded-xl bg-muted/30">
        <motion.p
          className="text-4xl font-display font-bold text-primary text-glow-primary"
          animate={canClaim ? { scale: [1, 1.02, 1] } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {totalRewards.toLocaleString()}
        </motion.p>
        <p className="text-sm text-muted-foreground mt-1">$BLOOM</p>
      </div>

      {/* Progress */}
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

        {/* Day markers - no numbers, just dots */}
        <div className="flex justify-between mt-2">
          {Array.from({ length: daysRequired }).map((_, i) => (
            <div
              key={i}
              className={`w-5 h-5 rounded-full flex items-center justify-center
                ${i < daysPlayed 
                  ? 'bg-primary border border-primary/60 shadow-[0_0_8px_hsl(var(--primary)/0.5)]' 
                  : 'bg-muted/30 border border-muted'
                }`}
            />
          ))}
        </div>
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
          {canClaim ? "Claim Rewards" : `Play ${daysRequired - daysPlayed} more days`}
        </span>
      </Button>

      {/* Info text */}
      <p className="text-center text-xs text-muted-foreground mt-3">
        {canClaim 
          ? "Your rewards are ready! Claim now." 
          : "Keep playing daily to unlock your rewards."
        }
      </p>
    </motion.div>
  );
};

export default RewardsTracker;
