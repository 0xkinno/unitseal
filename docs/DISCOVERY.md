# UNITSEAL Discovery Document

## 1. Sponsor Primitive

Robinhood Chain Stock Token economic state across multiple surfaces:
- `/assets` — currentMultiplier, pendingMultiplier, pendingMultiplierEffectiveTime, deployment info, trading capability
- `/prices/{symbol}` — raw underlying-equity bid/ask (NOT multiplier-adjusted)
- `/corporate-actions` — pending corporate action records
- `uiMultiplier()` — onchain multiplier function
- Onchain Chainlink price feeds
- ERC-20 token balances that can remain static while share-per-token relationship changes

## 2. Observed Constraint

Different data surfaces have different semantics and freshness:
- Raw token balance can stay the same while economic value changes via multiplier
- REST `/prices/{symbol}` explicitly NOT multiplier-adjusted
- REST endpoints are cached with endpoint-specific freshness
- Trading capabilities can differ by session
- A pending multiplier change can invalidate existing plans

## 3. Evidence

Official documentation:
- https://docs.robinhood.com/chain/stock-tokens/
- https://docs.robinhood.com/chain/stock-token-apis/

Key finding: The REST price API returns raw underlying equity prices without multiplier adjustment. An agent using these prices directly would calculate wrong economic values after a corporate action.

## 4. Why Common Automation Is Unsafe

A naive agent system:
1. Reads a quote from `/prices/{symbol}`
2. Calculates a raw token amount
3. Waits for human approval
4. Executes without re-verifying the economic state

Between step 3 and 4, the multiplier could change (corporate action), the quote could go stale, or trading capability could change. The execution would then use wrong economic assumptions.

## 5. New Capability Enabled

State-bound agentic execution with:
- A deterministic verification engine that reconciles multiple state surfaces
- A cryptographic seal binding plan + state + execution conditions
- An onchain execution guard that re-verifies state at execution time
- Explicit refusal when state has changed

## 6. Hard Invariant

**No consequential action may execute unless the exact asset identity, chain deployment, economic multiplier, applicable market/trading state, quote freshness requirements, plan hash, and seal expiry used in the human approval are still valid at the final execution gate.**

## 7. Failure Mode

Multiplier/state drift after human approval but before execution. The raw token balance stays the same, but the economic unit changes. Without UnitSeal, the action executes against wrong economics silently.

## 8. Reproducible Demonstration

1. Seal a plan against current multiplier (e.g., 1.0)
2. Artificially change the multiplier (test harness / controlled fixture)
3. Attempt execution
4. UnitSealGuard detects mismatch → REFUSE
5. Re-read state, reconcile, recompile, reseal
6. Execute successfully with new seal

This demonstrates: success → deliberate refusal → recovery → success.
