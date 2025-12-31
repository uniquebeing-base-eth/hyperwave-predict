
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, X, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useFarcaster } from "@/contexts/FarcasterContext";
import { useNeynarBalances } from "@/hooks/useNeynarBalances";
import { useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ProfileDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const { user, isAuthenticated, isInMiniApp } = useFarcaster();
  const { ethBalance, bloomBalance, address, isLoading, refreshBalances } = useNeynarBalances();
  const { connectors, connectAsync } = useConnect();
  const { disconnectAsync } = useDisconnect();

  const displayName = user?.displayName || user?.username || "User";
  const pfpUrl = user?.pfpUrl;

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success("Address copied!");
    }
  };

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleReconnectWallet = async () => {
    setIsReconnecting(true);
    try {
      // Disconnect first
      await disconnectAsync();
      
      // Find the Farcaster connector
      const farcasterConnector = connectors.find(c => c.id === 'farcaster');
      
      if (farcasterConnector) {
        await connectAsync({ connector: farcasterConnector });
        await refreshBalances();
        toast.success("Wallet reconnected to primary address!");
      } else {
        toast.error("Farcaster connector not found");
      }
    } catch (error) {
      console.error("Error reconnecting wallet:", error);
      toast.error("Failed to reconnect wallet");
    } finally {
      setIsReconnecting(false);
    }
  };

  if (!isInMiniApp || !isAuthenticated) {
    return null;
  }

  return (
    <div className="relative">
      {/* Profile Picture Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileTap={{ scale: 0.95 }}
        className="relative"
      >
        {pfpUrl ? (
          <img
            src={pfpUrl}
            alt={displayName}
            className="w-10 h-10 rounded-full border-2 border-primary/50 object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary-foreground" />
          </div>
        )}
        {/* Notification dot when balances loaded */}
        {!isLoading && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-background" />
        )}
      </motion.button>

      {/* Dropdown Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ type: "spring", damping: 25, stiffness: 400 }}
              className="absolute right-0 top-14 w-72 glass rounded-2xl border border-border/50 p-4 z-50 shadow-xl"
            >
              {/* Close button */}
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted/50 transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              {/* User Info */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border/30">
                {pfpUrl ? (
                  <img
                    src={pfpUrl}
                    alt={displayName}
                    className="w-12 h-12 rounded-full border-2 border-primary/50 object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-primary-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-display font-semibold text-foreground">{displayName}</p>
                  {user?.username && (
                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                  )}
                </div>
              </div>

              {/* Wallet Address */}
              {address && (
                <div className="mb-4 p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Primary Wallet</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={copyAddress}
                        className="p-1 hover:bg-muted/50 rounded transition-colors"
                      >
                        <Copy className="w-3 h-3 text-muted-foreground" />
                      </button>
                      <a
                        href={`https://basescan.org/address/${address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-muted/50 rounded transition-colors"
                      >
                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      </a>
                    </div>
                  </div>
                  <p className="font-mono text-sm text-foreground mt-1">
                    {shortenAddress(address)}
                  </p>
                </div>
              )}

              {/* Balances */}
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">ETH Balance</span>
                    <div className="w-5 h-5 rounded-full bg-[#627EEA] flex items-center justify-center">
                      <span className="text-white text-xs font-bold">Ξ</span>
                    </div>
                  </div>
                  <p className="font-display font-bold text-xl text-foreground mt-1">
                    {isLoading ? "..." : ethBalance}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">$BLOOM Balance</span>
                    <div className="w-5 h-5 rounded-full bg-gradient-primary flex items-center justify-center">
                      <span className="text-primary-foreground text-xs font-bold">B</span>
                    </div>
                  </div>
                  <p className="font-display font-bold text-xl text-primary text-glow-primary mt-1">
                    {isLoading ? "..." : bloomBalance}
                  </p>
                </div>
              </div>

              {/* Reconnect Wallet Button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-4"
                onClick={handleReconnectWallet}
                disabled={isReconnecting}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isReconnecting ? 'animate-spin' : ''}`} />
                {isReconnecting ? "Reconnecting..." : "Reconnect Primary Wallet"}
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileDropdown;
