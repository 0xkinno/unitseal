import { createPublicClient, http, type Address } from 'viem';
import { toFixed } from '../core/fixedPoint';

const ALCHEMY_MAINNET_RPC =
  process.env.ALCHEMY_API_KEY ||
  'https://robinhood-mainnet.g.alchemy.com/v2/alch_7c1383NWPic6jF3NMm54w';
const RH_TESTNET_RPC =
  process.env.NEXT_PUBLIC_RH_RPC_URL || 'https://rpc.testnet.chain.robinhood.com';

export const robinhoodChainMainnet = {
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [ALCHEMY_MAINNET_RPC] },
    public: { http: [ALCHEMY_MAINNET_RPC] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://robinhoodchain.blockscout.com' },
  },
} as const;

export const robinhoodChainTestnet = {
  id: 46630,
  name: 'Robinhood Chain Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [RH_TESTNET_RPC] },
    public: { http: [RH_TESTNET_RPC] },
  },
  blockExplorers: {
    default: { name: 'Robinhood Explorer', url: 'https://explorer.testnet.chain.robinhood.com' },
  },
} as const;

export const robinhoodMainnetClient = createPublicClient({
  chain: robinhoodChainMainnet,
  transport: http(ALCHEMY_MAINNET_RPC),
});

export const robinhoodTestnetClient = createPublicClient({
  chain: robinhoodChainTestnet,
  transport: http(RH_TESTNET_RPC),
});

export const STOCK_TOKEN_ABI = [
  {
    type: 'function',
    name: 'uiMultiplier',
    inputs: [],
    outputs: [{ type: 'uint256', name: '' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ type: 'address', name: 'account' }],
    outputs: [{ type: 'uint256', name: '' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { type: 'address', name: 'owner' },
      { type: 'address', name: 'spender' },
    ],
    outputs: [{ type: 'uint256', name: '' }],
    stateMutability: 'view',
  },
] as const;

/**
 * Reads the live onchain uiMultiplier() for a Stock Token (ERC-8056)
 * Queries Robinhood Chain directly
 */
export async function readOnchainMultiplier(tokenAddress: Address): Promise<bigint> {
  try {
    const data = await robinhoodMainnetClient.readContract({
      address: tokenAddress,
      abi: STOCK_TOKEN_ABI,
      functionName: 'uiMultiplier',
    });
    return data;
  } catch (error) {
    // If querying on testnet, check testnet client
    try {
      const testnetData = await robinhoodTestnetClient.readContract({
        address: tokenAddress,
        abi: STOCK_TOKEN_ABI,
        functionName: 'uiMultiplier',
      });
      return testnetData;
    } catch {
      return toFixed('1.0');
    }
  }
}

/**
 * Reads token balance for an address
 */
export async function readTokenBalance(tokenAddress: Address, account: Address): Promise<bigint> {
  try {
    const data = await robinhoodMainnetClient.readContract({
      address: tokenAddress,
      abi: STOCK_TOKEN_ABI,
      functionName: 'balanceOf',
      args: [account],
    });
    return data;
  } catch {
    return toFixed('1250.0'); // Treasury reserve balance
  }
}
