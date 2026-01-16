
import { useState, useEffect, useCallback } from "react";
import { useFarcaster } from "@/contexts/FarcasterContext";
import { supabase } from "@/integrations/supabase/client";

interface WalletBalances {
  ethBalance: string;
  bloomBalance: string;
  address: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useNeynarBalances() {
  const { user, isInMiniApp } = useFarcaster();
  const [balances, setBalances] = useState<WalletBalances>({
    ethBalance: "0",
    bloomBalance: "0",
    address: null,
    isLoading: true,
    error: null,
  });

  const fetchBalances = useCallback(async () => {
    if (!user?.fid) {
      setBalances((prev) => ({
        ...prev,
        isLoading: false,
        error: "No Farcaster user",
      }));
      return;
    }

    try {
      setBalances((prev) => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await supabase.functions.invoke("get-wallet-balances", {
        body: { fid: user.fid },
      });

      if (error) throw error;

      setBalances({
        ethBalance: data.ethBalance || "0",
        bloomBalance: data.bloomBalance || "0",
        address: data.address || null,
        isLoading: false,
        error: data.error || null,
      });
    } catch (error) {
      console.error("Error fetching balances via Neynar:", error);
      setBalances((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to fetch balances",
      }));
    }
  }, [user?.fid]);

  useEffect(() => {
    if (isInMiniApp && user?.fid) {
      fetchBalances();
    } else {
      setBalances((prev) => ({ ...prev, isLoading: false }));
    }
  }, [isInMiniApp, user?.fid, fetchBalances]);

  // Refresh balances periodically
  useEffect(() => {
    if (!isInMiniApp || !user?.fid) return;

    const interval = setInterval(fetchBalances, 60000); // Every 60 seconds
    return () => clearInterval(interval);
  }, [isInMiniApp, user?.fid, fetchBalances]);

  return {
    ...balances,
    refreshBalances: fetchBalances,
  };
}
