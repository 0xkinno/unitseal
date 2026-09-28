import type { Address } from '../core/types';

export const RH_MAINNET_CONFIG = {
  chainId: '0x1237', // 4663 in hex
  chainIdDecimal: 4663,
  chainName: 'Robinhood Chain',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: [
    process.env.NEXT_PUBLIC_RH_RPC_URL || 'https://rpc.mainnet.chain.robinhood.com',
  ],
  blockExplorerUrls: [
    process.env.NEXT_PUBLIC_RH_EXPLORER_URL || 'https://robinhoodchain.blockscout.com',
  ],
};

export const RH_TESTNET_CONFIG = {
  chainId: '0xb626', // 46630 in hex
  chainIdDecimal: 46630,
  chainName: 'Robinhood Chain Testnet',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['https://rpc.testnet.chain.robinhood.com'],
  blockExplorerUrls: ['https://explorer.testnet.chain.robinhood.com'],
};

export interface WalletState {
  isConnected: boolean;
  address: Address | null;
  chainId: number | null;
  isCorrectChain: boolean;
  error: string | null;
}

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}

export async function connectBrowserWallet(): Promise<{ address: Address; chainId: number }> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No EIP-1193 compatible wallet detected (e.g. MetaMask, Robinhood Wallet).');
  }

  const accounts = (await window.ethereum.request({
    method: 'eth_requestAccounts',
  })) as string[];

  if (!accounts || accounts.length === 0) {
    throw new Error('Wallet connection was cancelled by user.');
  }

  const chainIdHex = (await window.ethereum.request({
    method: 'eth_chainId',
  })) as string;

  return {
    address: accounts[0] as Address,
    chainId: parseInt(chainIdHex, 16),
  };
}

export async function switchToRobinhoodChain(preferMainnet: boolean = true): Promise<boolean> {
  if (typeof window === 'undefined' || !window.ethereum) return false;

  const targetConfig = preferMainnet ? RH_MAINNET_CONFIG : RH_TESTNET_CONFIG;

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: targetConfig.chainId }],
    });
    return true;
  } catch (switchError: unknown) {
    // Error code 4902 means chain has not been added yet
    const err = switchError as { code?: number };
    if (err.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [targetConfig],
        });
        return true;
      } catch (addError) {
        console.error('Failed to add Robinhood Chain:', addError);
        return false;
      }
    }
    console.error('Failed to switch to Robinhood Chain:', switchError);
    return false;
  }
}

export async function switchToRobinhoodMainnet(): Promise<boolean> {
  return switchToRobinhoodChain(true);
}

export async function switchToRobinhoodTestnet(): Promise<boolean> {
  return switchToRobinhoodChain(false);
}
