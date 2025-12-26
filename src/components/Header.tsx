import { motion } from "framer-motion";
import { Zap, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFarcaster } from "@/contexts/FarcasterContext";
import { useWalletBalances } from "@/hooks/useWalletBalances";
import ProfileDropdown from "@/components/ProfileDropdown";

const Header = () => {
  const { isAuthenticated, isInMiniApp } = useFarcaster();
  const { isConnected, connectWallet, isLoading } = useWalletBalances();

  // Use Farcaster user if available, otherwise fall back to wallet connection
  const showConnected = isInMiniApp ? isAuthenticated : isConnected;

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
        <div className="flex items-center gap-2">
          {showConnected ? (
            <ProfileDropdown />
          ) : (
            <Button 
              variant="neon" 
              size="sm" 
              onClick={connectWallet}
              disabled={isLoading}
            >
              <Wallet className="w-4 h-4" />
              {isLoading ? "..." : "Connect"}
            </Button>
          )}
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
