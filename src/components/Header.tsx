import { motion } from "framer-motion";
import { Zap, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  balance: number;
  isConnected: boolean;
}

const Header = ({ balance, isConnected }: HeaderProps) => {
  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <motion.div
          className="flex items-center gap-2"
          whileHover={{ scale: 1.02 }}
        >
          <div className="relative">
            <Zap className="w-8 h-8 text-primary" />
            <motion.div
              className="absolute inset-0 bg-primary/30 blur-xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-foreground tracking-wider">
              HYPER<span className="text-primary text-glow-primary">WAVE</span>
            </h1>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase -mt-1">
              Stake. Predict. Win.
            </p>
          </div>
        </motion.div>

        {/* User Info */}
        <div className="flex items-center gap-4">
          {isConnected ? (
            <motion.div
              className="flex items-center gap-3 px-4 py-2 rounded-xl glass"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="font-display font-bold text-primary text-glow-primary">
                  {balance.toLocaleString()} <span className="text-xs">ETH</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary-foreground" />
              </div>
            </motion.div>
          ) : (
            <Button variant="neon" size="sm">
              <Wallet className="w-4 h-4" />
              Connect
            </Button>
          )}
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
