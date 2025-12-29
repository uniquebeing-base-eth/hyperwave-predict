import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useFarcaster } from '@/contexts/FarcasterContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WalletValidation {
  isValid: boolean;
  isLoading: boolean;
  primaryAddress: string | null;
  error: string | null;
  checkWallet: () => Promise<boolean>;
}

export const useWalletValidation = (): WalletValidation => {
  const { address: connectedAddress } = useAccount();
  const { user, isInMiniApp } = useFarcaster();
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [primaryAddress, setPrimaryAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkWallet = useCallback(async (): Promise<boolean> => {
    if (!isInMiniApp || !user?.fid) {
      // Not in mini app, skip validation
      setIsValid(true);
      setIsLoading(false);
      return true;
    }

    if (!connectedAddress) {
      setIsValid(false);
      setIsLoading(false);
      setError('No wallet connected');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('get-wallet-balances', {
        body: { fid: user.fid },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      const farcasterPrimaryAddress = data?.address?.toLowerCase();
      const currentConnectedAddress = connectedAddress.toLowerCase();

      setPrimaryAddress(farcasterPrimaryAddress || null);

      if (!farcasterPrimaryAddress) {
        setError('No verified wallet found for your Farcaster account');
        setIsValid(false);
        setIsLoading(false);
        return false;
      }

      const isMatch = farcasterPrimaryAddress === currentConnectedAddress;
      setIsValid(isMatch);
      setIsLoading(false);

      if (!isMatch) {
        setError('Connected wallet does not match your primary Farcaster wallet');
        toast.error('Please connect your primary Farcaster wallet', {
          description: `Expected: ${farcasterPrimaryAddress.slice(0, 6)}...${farcasterPrimaryAddress.slice(-4)}`,
        });
      }

      return isMatch;
    } catch (err) {
      console.error('Wallet validation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to validate wallet');
      setIsValid(false);
      setIsLoading(false);
      return false;
    }
  }, [connectedAddress, user?.fid, isInMiniApp]);

  useEffect(() => {
    checkWallet();
  }, [checkWallet]);

  return {
    isValid,
    isLoading,
    primaryAddress,
    error,
    checkWallet,
  };
};
