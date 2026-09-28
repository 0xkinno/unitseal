import type { Address } from '../core/types';
import { toFixed } from '../core/fixedPoint';

export interface StockTokenAsset {
  assetUid: string;
  symbol: string;
  name: string;
  address: Address;
  chainId: number;
  currentMultiplier: bigint;
  pendingMultiplier?: bigint;
  pendingMultiplierEffectiveTime?: number;
  status: string;
  capabilities: {
    market: boolean;
    extended: boolean;
    overnight: boolean;
    fractional: boolean;
  };
}

// Canonical live Robinhood Stock Tokens from https://api.robinhood.com/rhj/assets
export const CANONICAL_STOCK_TOKENS: StockTokenAsset[] = [
  {
    assetUid: 'rh-stock-aapl-01',
    symbol: 'AAPL',
    name: 'Apple • Robinhood Token',
    address: '0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9' as Address,
    chainId: 4663,
    currentMultiplier: 1000566080061092436n,
    status: 'ASSET_STATUS_ACTIVE',
    capabilities: {
      market: true,
      extended: true,
      overnight: true,
      fractional: true,
    },
  },
  {
    assetUid: 'rh-stock-nvda-02',
    symbol: 'NVDA',
    name: 'NVIDIA • Robinhood Token',
    address: '0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC' as Address,
    chainId: 4663,
    currentMultiplier: 1000775159164630595n,
    status: 'ASSET_STATUS_ACTIVE',
    capabilities: {
      market: true,
      extended: true,
      overnight: true,
      fractional: true,
    },
  },
  {
    assetUid: 'rh-stock-tsla-03',
    symbol: 'TSLA',
    name: 'Tesla • Robinhood Token',
    address: '0x322F0929c4625eD5bAd873c95208D54E1c003b2d' as Address,
    chainId: 4663,
    currentMultiplier: 1000000000000000000n,
    status: 'ASSET_STATUS_ACTIVE',
    capabilities: {
      market: true,
      extended: true,
      overnight: true,
      fractional: true,
    },
  },
  {
    assetUid: 'rh-stock-crm-04',
    symbol: 'CRM',
    name: 'Salesforce • Robinhood Token',
    address: '0xd95B44124e475743a7589e68F3D74008A5536D44' as Address,
    chainId: 4663,
    currentMultiplier: 1001148322800714293n,
    status: 'ASSET_STATUS_ACTIVE',
    capabilities: {
      market: true,
      extended: true,
      overnight: true,
      fractional: true,
    },
  },
];

/**
 * Fetches Stock Tokens directly from Robinhood Chain's official REST API:
 * https://api.robinhood.com/rhj/assets
 */
export async function fetchStockAssets(): Promise<StockTokenAsset[]> {
  try {
    const res = await fetch('https://api.robinhood.com/rhj/assets', {
      next: { revalidate: 30 },
    });
    if (!res.ok) {
      return CANONICAL_STOCK_TOKENS;
    }
    const data = await res.json();
    if (!data.assets || !Array.isArray(data.assets)) {
      return CANONICAL_STOCK_TOKENS;
    }

    return data.assets
      .filter((a: any) => a.deployments && a.deployments.length > 0)
      .map((a: any) => {
        const deployment = a.deployments[0];
        const rawMult = a.currentMultiplier || '1.0';
        return {
          assetUid: a.id || `rh-${a.tokenSymbol.toLowerCase()}`,
          symbol: a.tokenSymbol,
          name: a.tokenName,
          address: deployment.contractAddress as Address,
          chainId: deployment.chainId || 4663,
          currentMultiplier: toFixed(rawMult),
          pendingMultiplier: a.pendingMultiplier ? toFixed(a.pendingMultiplier) : undefined,
          status: a.status,
          capabilities: {
            market: a.tradingCapabilities?.market?.whole === 'TRADING_STATUS_TRADABLE',
            extended: a.tradingCapabilities?.extended?.whole === 'TRADING_STATUS_TRADABLE',
            overnight: a.tradingCapabilities?.overnight?.whole === 'TRADING_STATUS_TRADABLE',
            fractional: a.tradingCapabilities?.market?.fractional === 'TRADING_STATUS_TRADABLE',
          },
        };
      });
  } catch (error) {
    console.warn('[Assets Adapter] Falling back to verified canonical Robinhood assets:', error);
    return CANONICAL_STOCK_TOKENS;
  }
}

export async function getStockAssetBySymbol(symbol: string): Promise<StockTokenAsset | undefined> {
  const assets = await fetchStockAssets();
  return assets.find((a) => a.symbol.toUpperCase() === symbol.toUpperCase());
}

export async function getStockAssetByAddress(address: Address): Promise<StockTokenAsset | undefined> {
  const assets = await fetchStockAssets();
  return assets.find((a) => a.address.toLowerCase() === address.toLowerCase());
}
