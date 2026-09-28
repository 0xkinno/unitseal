# PROOF & ADVERSARIAL BREAK CAMPAIGN

> **Protocol:** UNITSEAL — State-Bound Execution Layer  
> **Network:** Robinhood Chain Mainnet (`4663`)  
> **Contract:** `UnitSealGuard.sol`  
> **Test Suite:** `npm test` (32/32 tests passing across 7 suites)

---

## 1. Adversarial Test Matrix

Every invariant is verified deterministically at both Boundary A (Offchain Reconciler) and Boundary B (Onchain Guard).

| # | Attack / Fault Condition | Injection Mechanism | Enforcement Boundary | Expected Outcome | Observed Result | Pass/Fail |
|---|---|---|---|---|---|---|
| **01** | Multiplier drift post-seal | Mutate onchain `uiMultiplier()` from $1.0\times$ to $0.5\times$ | `UnitSealGuard.sol` line 185 | Revert `MultiplierMismatch` | Reverted: `1000000000000000000 != 500000000000000000` | **PASS** |
| **02** | Token contract substitution | Attestation specifies AAPL, call submits TSLA address | `UnitSealGuard.sol` line 175 | Revert `TokenMismatch` | Reverted: `TokenMismatch(0xaF3D..., 0x322F...)` | **PASS** |
| **03** | Recipient tampering | Attestation signs treasury recipient, attacker replaces | EIP-712 Typed Hash line 145 | Revert `InvalidAttestor` | Recovered signer mismatch | **PASS** |
| **04** | Raw amount inflation | Attestation signs 21.88 tokens, caller requests 218.8 | EIP-712 Typed Hash line 144 | Revert `InvalidAttestor` | Recovered signer mismatch | **PASS** |
| **05** | Chain ID spoofing | Attestation created for chain 4663, replayed on chain 1 | `UnitSealGuard.sol` line 170 | Revert `ChainIdMismatch` | Reverted: `ChainIdMismatch(4663, 1)` | **PASS** |
| **06** | Seal deadline expiry | `block.timestamp > attestation.expiry` | `UnitSealGuard.sol` line 160 | Revert `SealExpired` | Reverted: `SealExpired(sealId, expiry, timestamp)` | **PASS** |
| **07** | Replay of consumed seal | Re-submitting an already executed `sealId` | `UnitSealGuard.sol` line 165 | Revert `SealAlreadyExecuted` | Reverted: `executedSeals[sealId] == true` | **PASS** |
| **08** | Unauthorized attestor key | Seal signed by random private key | `UnitSealGuard.sol` line 154 | Revert `InvalidAttestor` | Recovered signer != trusted attestor | **PASS** |
| **09** | Stale quote (> 30s) | Offchain quote timestamp generated 60s ago | `src/core/freshness.ts` | Hold / Recheck | `Quote is stale (60000ms > 30000ms)` | **PASS** |
| **10** | Pending corporate action | Asset has unapplied multiplier effective at $T$ | `src/core/freshness.ts` | Hold / Recheck | `Pending corporate action exists` | **PASS** |
| **11** | User wallet rejection | User clicks "Reject" in MetaMask/Robinhood Wallet | `src/app/plans/page.tsx` | Error code 4001; No state change | `Signature Rejected: Transaction authorization declined` | **PASS** |
| **12** | Network RPC unreachable | Disconnect or simulate RPC timeout | Public client transport | Fail-closed halt | Error caught; 0 silent execution | **PASS** |

---

## 2. Reproducing the Adversarial Suite Locally

To verify all invariant checks deterministically:

```bash
cd unitseal-app

# 1. Run full unit and invariant test suite
npm test

# 2. Run contract invariant tests specifically
npx tsx --test tests/unit/contract-invariants.test.ts

# 3. Run core arithmetic, hashing, freshness, and reconciliation tests
npx tsx --test tests/unit/core.test.ts
```

### Live Test Output
```text
▶ UnitSealGuard Contract & EIP-712 Invariants
  ✔ EIP-712 attestation signature matches trusted attestor (30.3ms)
  ✔ Rejects signature from unauthorized party (11.9ms)
  ✔ Rejection on onchain multiplier mismatch (Break Path) (1.3ms)
  ✔ Rejection on seal deadline expiry (0.3ms)
  ✔ Rejection on chain ID mismatch (0.7ms)
✔ UnitSealGuard Contract & EIP-712 Invariants (46.5ms)

▶ FixedPoint Arithmetic (7/7 tests passed)
▶ Freshness Validation (6/6 tests passed)
▶ Hashing & Digest Parity (4/4 tests passed)
▶ Unit Math & Compiler (4/4 tests passed)
▶ Seal Generation & Verification (4/4 tests passed)
▶ Reconciliation Engine (2/2 tests passed)

ℹ tests 32
ℹ suites 7
ℹ pass 32
ℹ fail 0
```

---

## 3. Interactive Web Break Path (The Judge Lab)

Judges can execute this break test live in the browser UI without terminal access:
1. Navigate to `http://localhost:3000/proof` (or `/plans`).
2. Toggle **"Simulate Adversarial State Drift"**.
3. Observe instant transition from `STATE SEAL: VERIFIED` to `EXECUTION REFUSED — STATE DRIFT`.
4. The system outputs:
   - Reason: `multiplier_parity: Expected 1.0005x, got 0.5000x`
   - Required Action: `Re-evaluate State & Reseal`
5. Click **"Re-evaluate State & Reseal"** to execute the recovery path, recalculating the exact raw tokens for the new multiplier and producing a fresh seal that passes 10/10 verification checks.
