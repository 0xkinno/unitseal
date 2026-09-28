# UNITSEAL Architecture

## System Overview

UnitSeal is a two-boundary state-binding execution system for Robinhood Chain Stock Token operations.

## Trust Boundaries

```
              HUMAN
                │
                ▼
        ┌─────────────────┐
        │   UNITSEAL UI  │
        └────────┬────────┘
                 │
                 ▼
        ┌─────────────────┐
        │ SERV Reasoning  │
        │ intent → plan   │
        └────────┬────────┘
                 │
                 ▼
     ┌─────────────────────────┐
     │ Deterministic Verifier  │
     │ state + math + freshness│
     └────────────┬────────────┘
                  │ seal
                  ▼
             HUMAN SIGN
                  │
                  ▼
     ┌─────────────────────────┐
     │    UnitSealGuard        │
     │ final state enforcement  │
     └────────────┬────────────┘
                  │
                  ▼
             ONCHAIN ACTION
```

## Components

### 1. Frontend (Next.js)
- Landing page with hero, problem/solution, proof section
- Dashboard with wallet connection, chain switching
- Plan review screen showing SERV output + state checks
- Seal journal
- Proof page with live state, happy path, break path
- Activity feed

### 2. Wallet Layer (Wagmi + Viem)
- EIP-1193 compatible wallet connection
- Chain switching (Robinhood Chain Testnet 46630 / Mainnet 4663)
- Transaction signing
- Pending transaction tracking

### 3. Robinhood Adapters
- `/assets` — Stock Token metadata, multiplier, capability
- `/prices/{symbol}` — raw quote data with freshness
- `/corporate-actions` — pending action status
- Onchain `uiMultiplier()` reads via ethers/viem

### 4. SERV Adapter
- Converts human intent to structured action plan
- Uses SERV Reasoning API
- Compiles natural language into canonical ActionPlan

### 5. Deterministic Core (Pure TypeScript)
- `canonicalize.ts` — normalize external data
- `hashing.ts` — deterministic hashing (keccak256)
- `fixedPoint.ts` — integer/fixed-point arithmetic
- `unitMath.ts` — multiplier-adjusted calculations
- `stateModel.ts` — UnitStateSnapshot type
- `capability.ts` — trading capability validation
- `freshness.ts` — quote age validation
- `corporateAction.ts` — pending action detection
- `reconciler.ts` — multi-surface state reconciliation
- `seal.ts` — UnitSeal generation and verification
- `invariant.ts` — invariant checking

### 6. Onchain Guard (Solidity)
- `UnitSealGuard.sol` — execution guard contract
- Stores attestor address
- Verifies EIP-712 attestation
- Checks seal expiry, chain ID, token, recipient, amount
- Reads onchain `uiMultiplier()`
- Prevents replay
- Executes constrained transfer or reverts

## Data Flow

1. Human enters intent (natural language)
2. SERV converts to structured plan proposal
3. Deterministic compiler creates canonical ActionPlan
4. State collector gathers:
   - Offchain: /assets, /prices, /corporate-actions
   - Onchain: uiMultiplier(), oracle observations
5. Reconciler validates:
   - Asset identity matches
   - Chain ID matches
   - Multiplier parity (offchain vs onchain)
   - No pending corporate actions (or policy allows)
   - Quote freshness within threshold
   - Trading capability supports operation
6. SealCompiler creates UnitSeal with:
   - planHash
   - stateHash
   - expectedMultiplier
   - rawAmount
   - recipient
   - capability requirement
   - expiry
7. Human reviews seal and signs transaction
8. UnitSealGuard verifies:
   - Attestation signature
   - Seal not expired
   - Chain ID match
   - Token match
   - Recipient match
   - Amount match
   - Onchain multiplier matches expected
   - Seal not replayed
9. If all checks pass → execute transfer
10. If any check fails → revert with reason

## Key Design Decisions

### Pure TypeScript Core
The deterministic verification engine has no network dependencies. This makes it:
- Unit testable without mocks
- Auditable as pure logic
- Portable across environments

### Onchain Final Gate
The contract re-reads `uiMultiplier()` at execution time. This ensures:
- The state checked offchain is still valid onchain
- No reliance on potentially stale offchain data for final execution
- A clear separation: offchain reconciliation + onchain enforcement

### EIP-712 Attestation
The attestor signs a structured typed data object binding all critical parameters. This provides:
- Cryptographic integrity of the seal
- Clear separation between attestor ( certifies offchain checks) and user (authorizes execution)
- Non-custodial design: attestor has no fund access

### Fail Closed
If any load-bearing condition cannot be verified:
- HOLD / RECHECK / REPLAN
- Never guess, silently continue, or substitute stale data

## API Design

### State Collection
```typescript
interface StateCollection {
  chainId: bigint;
  tokenAddress: Address;
  assetUid: string;
  tokenSymbol: string;
  rawBalance: bigint;
  currentMultiplierOffchain: bigint;
  currentMultiplierOnchain: bigint;
  pendingMultiplier?: bigint;
  pendingMultiplierEffectiveTime?: number;
  rawBidUsd?: bigint;
  rawAskUsd?: bigint;
  quoteGeneratedAt?: number;
  tradingCapability: TradingCapability;
  corporateActionContext: CorporateActionContext;
  observationAt: number;
  stateDigest: `0x${string}`;
}
```

### Action Plan
```typescript
interface ActionPlan {
  actionId: string;
  userIntent: string;
  actionType: "TRANSFER" | "REBALANCE";
  token: Address;
  chainId: bigint;
  from: Address;
  to: Address;
  targetEconomicValueUsd?: bigint;
  rawAmount: bigint;
  maxSlippageBps?: number;
  expiry: number;
  requiredMultiplier: bigint;
  requiredCapability: string;
  rationale: string;
  planHash: `0x${string}`;
}
```

### Unit Seal
```typescript
interface UnitSeal {
  sealId: string;
  planHash: `0x${string}`;
  stateHash: `0x${string}`;
  chainId: bigint;
  tokenAddress: Address;
  expectedMultiplier: bigint;
  rawAmount: bigint;
  recipient: Address;
  capability: string;
  observedAt: number;
  expiresAt: number;
  attestationHash: `0x${string}`;
  status: "SEALED" | "STALE" | "EXECUTED" | "REFUSED" | "EXPIRED";
}
```
