'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Address } from '../core/types';
import {
  connectBrowserWallet,
  switchToRobinhoodChain,
  RH_MAINNET_CONFIG,
  RH_TESTNET_CONFIG,
  type WalletState,
} from './connection';

const TARGET_CHAIN_ID = Number(process.env.NEXT_PUBLIC_RH_CHAIN_ID || 4663);

interface WalletContextType extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  switchChain: () => Promise<void>;
  isConnecting: boolean;
  targetChainId: number;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkInitialConnection = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) return;
    try {
      const accounts = (await window.ethereum.request({ method: 'eth_accounts' })) as string[];
      if (accounts && accounts.length > 0) {
        setAddress(accounts[0] as Address);
        const chainIdHex = (await window.ethereum.request({ method: 'eth_chainId' })) as string;
        setChainId(parseInt(chainIdHex, 16));
      }
    } catch {
      // Passive check fails silently
    }
  }, []);

  useEffect(() => {
    checkInitialConnection();

    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts: unknown) => {
        const accs = accounts as string[];
        if (accs.length === 0) {
          setAddress(null);
        } else {
          setAddress(accs[0] as Address);
        }
      };

      const handleChainChanged = (newChainId: unknown) => {
        setChainId(parseInt(newChainId as string, 16));
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum?.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [checkInitialConnection]);

  const connect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const res = await connectBrowserWallet();
      setAddress(res.address);
      setChainId(res.chainId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setError(message);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setChainId(null);
  };

  const switchChain = async () => {
    const isMainnet = TARGET_CHAIN_ID === 4663;
    const ok = await switchToRobinhoodChain(isMainnet);
    if (ok) {
      setChainId(isMainnet ? RH_MAINNET_CONFIG.chainIdDecimal : RH_TESTNET_CONFIG.chainIdDecimal);
    }
  };

  const isConnected = !!address;
  // Consider valid if on Robinhood Mainnet (4663) or Testnet (46630)
  const isCorrectChain = chainId === 4663 || chainId === 46630;

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        address,
        chainId,
        isCorrectChain,
        error,
        connect,
        disconnect,
        switchChain,
        isConnecting,
        targetChainId: TARGET_CHAIN_ID,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
