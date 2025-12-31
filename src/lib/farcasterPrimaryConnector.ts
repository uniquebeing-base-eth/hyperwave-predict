
import MiniAppSDK, { sdk } from '@farcaster/miniapp-sdk';
import {
  ChainNotConfiguredError,
  type Connector,
  createConnector,
} from '@wagmi/core';
import { fromHex, getAddress, numberToHex, SwitchChainError } from 'viem';

import { supabase } from '@/integrations/supabase/client';

let accountsChanged: Connector['onAccountsChanged'] | undefined;
let chainChanged: Connector['onChainChanged'] | undefined;
let disconnect: Connector['onDisconnect'] | undefined;

async function fetchPrimaryFarcasterAddress(): Promise<string | null> {
  try {
    const context = await sdk.context;
    const fid = context?.user?.fid;
    if (!fid) return null;

    const { data, error } = await supabase.functions.invoke('get-wallet-balances', {
      body: { fid },
    });

    if (error) return null;

    const address = data?.address;
    return typeof address === 'string' && address
      ? address.toLowerCase()
      : null;
  } catch {
    return null;
  }
}

function reorderAccountsToPrimary(accounts: string[], primary: string | null): string[] {
  if (!primary) return accounts;
  const idx = accounts.findIndex((a) => a?.toLowerCase?.() === primary);
  if (idx <= 0) return accounts;
  return [accounts[idx]!, ...accounts.slice(0, idx), ...accounts.slice(idx + 1)];
}

export function farcasterMiniAppPrimary() {
  return createConnector<typeof MiniAppSDK.wallet.ethProvider>((config) => ({
    id: 'farcaster',
    name: 'Farcaster',
    rdns: 'xyz.farcaster.MiniAppWallet',
    icon: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/055c25d6-7fe7-4a49-abf9-49772021cf00/original',
    type: 'farcasterMiniApp',

    async connect({ chainId, withCapabilities } = {}) {
      const provider = await this.getProvider();
      const rawAccounts = (await provider.request({
        method: 'eth_requestAccounts',
      })) as string[];

      const primary = await fetchPrimaryFarcasterAddress();
      const orderedAccounts = reorderAccountsToPrimary(rawAccounts, primary);
      const addresses = orderedAccounts.map((x) => getAddress(x as `0x${string}`));

      let targetChainId = chainId;
      if (!targetChainId) {
        const state = (await config.storage?.getItem('state')) ?? {};
        const isChainSupported = config.chains.some((x) => x.id === state.chainId);
        if (isChainSupported) targetChainId = state.chainId;
        else targetChainId = config.chains[0]?.id;
      }
      if (!targetChainId) throw new Error('No chains found on connector.');

      if (!accountsChanged) {
        accountsChanged = this.onAccountsChanged.bind(this);
        provider.on('accountsChanged', accountsChanged);
      }
      if (!chainChanged) {
        chainChanged = this.onChainChanged.bind(this);
        provider.on('chainChanged', chainChanged);
      }
      if (!disconnect) {
        disconnect = this.onDisconnect.bind(this);
        provider.on('disconnect', disconnect);
      }

      let currentChainId = await this.getChainId();
      if (targetChainId && currentChainId !== targetChainId) {
        const chain = await this.switchChain!({ chainId: targetChainId });
        currentChainId = chain.id;
      }

      if (withCapabilities) {
        return {
          accounts: addresses.map((address) => ({
            address,
            capabilities: {},
          })),
          chainId: currentChainId,
        } as any;
      }

      return {
        accounts: addresses,
        chainId: currentChainId,
      } as any;
    },

    async disconnect() {
      const provider = await this.getProvider();

      if (accountsChanged) {
        provider.removeListener('accountsChanged', accountsChanged);
        accountsChanged = undefined;
      }

      if (chainChanged) {
        provider.removeListener('chainChanged', chainChanged);
        chainChanged = undefined;
      }

      if (disconnect) {
        provider.removeListener('disconnect', disconnect);
        disconnect = undefined;
      }
    },

    async getAccounts() {
      const provider = await this.getProvider();
      const rawAccounts = (await provider.request({
        method: 'eth_accounts',
      })) as string[];

      const primary = await fetchPrimaryFarcasterAddress();
      const orderedAccounts = reorderAccountsToPrimary(rawAccounts, primary);

      return orderedAccounts.map((x) => getAddress(x as `0x${string}`));
    },

    async getChainId() {
      const provider = await this.getProvider();
      const hexChainId = (await provider.request({ method: 'eth_chainId' })) as `0x${string}`;
      return fromHex(hexChainId, 'number');
    },

    async isAuthorized() {
      try {
        const accounts = await this.getAccounts();
        return !!accounts.length;
      } catch {
        return false;
      }
    },

    async switchChain({ chainId }) {
      const provider = await this.getProvider();
      const chain = config.chains.find((x) => x.id === chainId);
      if (!chain) {
        throw new SwitchChainError(new ChainNotConfiguredError());
      }

      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: numberToHex(chainId as number) }],
      });

      // Workaround for providers not emitting events reliably
      config.emitter.emit('change', { chainId });

      return chain;
    },

    async onAccountsChanged(rawAccounts) {
      if (rawAccounts.length === 0) {
        this.onDisconnect();
        return;
      }

      const primary = await fetchPrimaryFarcasterAddress();
      const orderedAccounts = reorderAccountsToPrimary(rawAccounts as string[], primary);

      config.emitter.emit('change', {
        accounts: orderedAccounts.map((x) => getAddress(x as `0x${string}`)),
      });
    },

    onChainChanged(chain) {
      const chainId = Number(chain);
      config.emitter.emit('change', { chainId });
    },

    async onDisconnect() {
      config.emitter.emit('disconnect');
    },

    async getProvider() {
      return MiniAppSDK.wallet.ethProvider;
    },
  }));
}
