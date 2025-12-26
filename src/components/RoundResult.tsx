import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Trophy, X } from "lucide-react";

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
  const isWin = result === userBet && result !== null;
  const isDraw = result === "draw";

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
                : isDraw
                ? "border-accent glow-accent"
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
                    : "bg-accent/20"
                }`}
              >
                {result === "up" ? (
                  <TrendingUp className="w-16 h-16 text-success" />
                ) : result === "down" ? (
                  <TrendingDown className="w-16 h-16 text-danger" />
                ) : (
                  <Minus className="w-16 h-16 text-accent" />
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
                    : "text-accent text-glow-accent"
                }`}
              >
                {result?.toUpperCase() || "DRAW"}
              </h2>
              <p className="text-muted-foreground">
                Market moved {result === "draw" ? "nowhere" : result}
              </p>
            </motion.div>

            {/* User Result */}
            {userBet && (
              <motion.div
                className={`p-4 rounded-xl ${
                  isWin
                    ? "bg-success/10 border border-success/30"
                    : isDraw
                    ? "bg-accent/10 border border-accent/30"
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
                      {isWin ? "You Won!" : isDraw ? "Draw - Bet Lost" : "You Lost"}
                    </p>
                    <p
                      className={`text-2xl font-display font-bold ${
                        isWin
                          ? "text-success text-glow-success"
                          : isDraw
                          ? "text-accent"
                          : "text-danger"
                      }`}
                    >
                      {isWin ? `+${amount * 2}` : isDraw ? `-${amount}` : `-${amount}`} ETH
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Reward Earned */}
            <motion.p
              className="text-center text-sm text-accent mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              +10 reward tokens earned! 🎁
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RoundResult;
