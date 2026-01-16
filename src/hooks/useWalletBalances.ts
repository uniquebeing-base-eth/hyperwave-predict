
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

// $BLOOM Token Contract Address on Base
const BLOOM_TOKEN_ADDRESS = '0xa07e759da6b3d4d75ed76f92fbcb867b9c145b07';

// ERC20 ABI (minimal for balance checking)
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

interface WalletBalances {
  ethBalance: string;
  bloomBalance: string;
  ethBalanceRaw: bigint;
  bloomBalanceRaw: bigint;
  isConnected: boolean;
  address: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useWalletBalances() {
  const [balances, setBalances] = useState<WalletBalances>({
    ethBalance: '0',
    bloomBalance: '0',
    ethBalanceRaw: BigInt(0),
    bloomBalanceRaw: BigInt(0),
    isConnected: false,
    address: null,
    isLoading: true,
    error: null,
  });

  const fetchBalances = useCallback(async () => {
    try {
      // Check if window.ethereum exists (MetaMask or other wallet)
      if (typeof window === 'undefined' || !window.ethereum) {
        setBalances(prev => ({
          ...prev,
          isLoading: false,
          isConnected: false,
          error: 'No wallet detected',
        }));
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Get connected accounts
      const accounts = await provider.listAccounts();
      
      if (accounts.length === 0) {
        setBalances(prev => ({
          ...prev,
          isLoading: false,
          isConnected: false,
          error: null,
        }));
        return;
      }

      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      // Fetch ETH balance
      const ethBalanceRaw = await provider.getBalance(address);
      const ethBalance = ethers.formatEther(ethBalanceRaw);

      // Fetch BLOOM token balance
      const bloomContract = new ethers.Contract(BLOOM_TOKEN_ADDRESS, ERC20_ABI, provider);
      const bloomBalanceRaw = await bloomContract.balanceOf(address);
      const bloomDecimals = await bloomContract.decimals();
      const bloomBalance = ethers.formatUnits(bloomBalanceRaw, bloomDecimals);

      setBalances({
        ethBalance: parseFloat(ethBalance).toFixed(4),
        bloomBalance: parseFloat(bloomBalance).toLocaleString('en-US', { maximumFractionDigits: 0 }),
        ethBalanceRaw: ethBalanceRaw,
        bloomBalanceRaw: bloomBalanceRaw,
        isConnected: true,
        address,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error fetching wallet balances:', error);
      setBalances(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch balances',
      }));
    }
  }, []);

  const connectWallet = useCallback(async () => {
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('No wallet detected');
      }

      await window.ethereum.request({ method: 'eth_requestAccounts' });
      await fetchBalances();
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setBalances(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to connect wallet',
      }));
    }
  }, [fetchBalances]);

  const disconnectWallet = useCallback(() => {
    setBalances({
      ethBalance: '0',
      bloomBalance: '0',
      ethBalanceRaw: BigInt(0),
      bloomBalanceRaw: BigInt(0),
      isConnected: false,
      address: null,
      isLoading: false,
      error: null,
    });
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        fetchBalances();
      }
    };

    const handleChainChanged = () => {
      fetchBalances();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    // Initial fetch
    fetchBalances();

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [fetchBalances, disconnectWallet]);

  // Refresh balances periodically
  useEffect(() => {
    if (!balances.isConnected) return;

    const interval = setInterval(fetchBalances, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [balances.isConnected, fetchBalances]);

  return {
    ...balances,
    connectWallet,
    disconnectWallet,
    refreshBalances: fetchBalances,
  };
}

// Type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
      selectedAddress?: string;
    };
  }
}
