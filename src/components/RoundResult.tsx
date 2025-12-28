import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Trophy, X, Zap, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFarcasterShare } from "@/hooks/useFarcasterShare";
import { useFarcaster } from "@/contexts/FarcasterContext";

interface RoundResultProps {
  result: "up" | "down" | "draw" | null;
  userBet: "up" | "down" | null;
  amount: number;
  isVisible: boolean;
  onClose: () => void;
}

const RoundResult = ({
  result,
  userBet,
  amount,
  isVisible,
  onClose,
}: RoundResultProps) => {
  const { shareWin } = useFarcasterShare();
  const { user, isInMiniApp } = useFarcaster();
  
  // HyperWave: Draw = Loss (no refunds, house keeps funds)
  const isWin = result !== null && result !== "draw" && result === userBet;
  const isLoss = !isWin;

  const handleShare = async () => {
    if (result && result !== "draw") {
      await shareWin({
        amount,
        result,
        username: user?.username,
      });
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={`relative p-8 rounded-3xl glass border-2 ${
              isWin
                ? "border-success glow-success"
                : "border-danger glow-danger"
            }`}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", damping: 15 }}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Result Icon */}
            <motion.div
              className="flex justify-center mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <div
                className={`p-6 rounded-full ${
                  result === "up"
                    ? "bg-success/20"
                    : result === "down"
                    ? "bg-danger/20"
                    : "bg-warning/20"
                }`}
              >
                {result === "up" ? (
                  <TrendingUp className="w-16 h-16 text-success" />
                ) : result === "down" ? (
                  <TrendingDown className="w-16 h-16 text-danger" />
                ) : (
                  <Minus className="w-16 h-16 text-warning" />
                )}
              </div>
            </motion.div>

            {/* Result Text */}
            <motion.div
              className="text-center mb-6"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <h2
                className={`text-3xl font-display font-bold mb-2 ${
                  result === "up"
                    ? "text-success text-glow-success"
                    : result === "down"
                    ? "text-danger text-glow-danger"
                    : "text-warning text-glow-warning"
                }`}
              >
                {result === "draw" ? "DRAW" : result?.toUpperCase()}
              </h2>
              <p className="text-muted-foreground">
                {result === "draw" 
                  ? "Price unchanged - House wins" 
                  : `Market moved ${result}`}
              </p>
            </motion.div>

            {/* User Result */}
            {userBet && (
              <motion.div
                className={`p-4 rounded-xl ${
                  isWin
                    ? "bg-success/10 border border-success/30"
                    : "bg-danger/10 border border-danger/30"
                }`}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center justify-center gap-4">
                  {isWin && <Trophy className="w-6 h-6 text-success" />}
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">
                      {isWin ? "You Won! 🎉" : result === "draw" ? "Draw = Loss" : "You Lost"}
                    </p>
                    <p
                      className={`text-2xl font-display font-bold ${
                        isWin
                          ? "text-success text-glow-success"
                          : "text-danger"
                      }`}
                    >
                      {isWin ? `+${(amount * 2).toLocaleString()}` : `-${amount.toLocaleString()}`} $BLOOM
                    </p>
                    {isWin && (
                      <p className="text-xs text-success/80 mt-1">
                        <Zap className="w-3 h-3 inline mr-1" />
                        Paid instantly to your wallet
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Reward Earned */}
            <motion.div
              className="text-center mt-4 p-2 rounded-lg bg-primary/10 border border-primary/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <p className="text-sm text-primary">
                +1,000 $BLOOM reward earned! 🎁
              </p>
              <p className="text-xs text-muted-foreground">
                Claim after 7-day streak
              </p>
            </motion.div>

            {/* Share Button - Only show for wins */}
            {isWin && isInMiniApp && (
              <motion.div
                className="mt-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Button 
                  onClick={handleShare}
                  className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share on Farcaster
                </Button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RoundResult;
