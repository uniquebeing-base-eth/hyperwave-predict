import { motion } from "framer-motion";
import PhaseTracker from "@/components/PhaseTracker";
import RewardsTracker from "@/components/RewardsTracker";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { usePhaseState } from "@/hooks/usePhaseState";
import { useBloomRewards } from "@/hooks/useBloomRewards";
import { useFarcasterShare } from "@/hooks/useFarcasterShare";
import { useFarcaster } from "@/contexts/FarcasterContext";
import { useState } from "react";
import { toast } from "sonner";

interface RewardsPageProps {
  rewards: number;
  streak?: number;
}

const RewardsPage = ({ rewards, streak = 0 }: RewardsPageProps) => {
  const { phaseNumber, daysRemaining } = usePhaseState();
  const { user } = useFarcaster();
  const { claim, isClaiming, claimableBloom, claimedBloom, claimedThisPhase, multiplier } = useBloomRewards();
  const { shareToFarcaster } = useFarcasterShare();

  const multiplierUnlocked = multiplier === 2;
  const canClaim = claimableBloom > 0 && !claimedThisPhase;
  const displayRewards = claimableBloom > 0 ? claimableBloom : rewards;

  const [lastClaimed, setLastClaimed] = useState<number>(0);

  const handleClaim = async () => {
    const result = await claim();
    if (result.success) {
      setLastClaimed(result.amount);
      toast.success("Rewards claimed!", {
        description: `${result.amount.toLocaleString()} $BLOOM sent to your wallet`,
      });
    }
  };

  const handleShare = async () => {
    const amount = lastClaimed || claimableBloom;
    const text =
      `🌸 Just claimed ${amount.toLocaleString()} $BLOOM rewards on @hyperwave!\n\n` +
      `🔥 ${streak}-day streak • Phase ${phaseNumber}\n\n` +
      `Stack your streak, claim your bag.`;
    await shareToFarcaster(text);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-md mx-auto space-y-5"
    >
      <motion.div
        className="text-center mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-lg font-display uppercase tracking-widest text-muted-foreground mb-1">
          Phase <span className="text-accent text-glow-accent">{phaseNumber}</span> Rewards
        </h2>
        <p className="text-xs text-muted-foreground">
          Track your progress and claim rewards.
        </p>
      </motion.div>

      <PhaseTracker
        currentPhase={phaseNumber}
        daysRemaining={daysRemaining}
        totalRewards={displayRewards}
        tokenSymbol="BLOOM"
      />

      <RewardsTracker
        totalRewards={displayRewards}
        daysPlayed={streak}
        canClaim={canClaim && !isClaiming}
        multiplierUnlocked={multiplierUnlocked}
        onClaim={handleClaim}
      />

      {claimedThisPhase && (
        <p className="text-center text-xs text-accent">
          ✓ Claimed for Phase {phaseNumber}. Next claim opens in {daysRemaining}d when this phase ends.
        </p>
      )}

      {claimedBloom > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Lifetime claimed: {claimedBloom.toLocaleString()} $BLOOM
        </p>
      )}

      {(lastClaimed > 0 || claimedThisPhase) && (
        <Button variant="neon" size="lg" className="w-full" onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-2" />
          Share claim on Farcaster
        </Button>
      )}
    </motion.div>
  );
};

export default RewardsPage;
