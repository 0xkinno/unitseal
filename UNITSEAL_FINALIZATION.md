# UNITSEAL — FINALIZATION / AUTHENTICITY PATCH

## Status
Do not add new product features. The product thesis and UI surface are sufficient. Finish the existing loop so every claimed step is real, deterministic, mainnet-bound, and judge-reproducible.

## 0. Non-negotiable target
Production network is Robinhood Chain Mainnet `4663`.
Testnet is only for rehearsal / fixtures / break testing.
The final user flow must be:

Human intent -> SERV live response -> canonical plan -> live Robinhood state -> deterministic reconciliation -> UnitSeal -> human review -> wallet transaction -> UnitSealGuard on mainnet -> real Stock Token transfer -> real Blockscout tx.

No mock, random, fallback, fake tx hash, simulated success, or testnet label may appear in the production path.

## 1. Fix SERV wiring first
`/api/serv/plan` is currently called, but the frontend hides failures and the server silently falls back when SERV is unavailable.

Change behavior to:
- Require `SERV_API_KEY` in production.
- Use `https://inference-api.openserv.ai/v1/chat/completions` with `model=serv-standard`.
- Do not silently fall back to a deterministic pseudo-SERV result in production.
- Return structured error state to the browser when SERV fails.
- Render an inline error card with HTTP status / request id / retry action.
- Preserve the real SERV completion id in the audit record.
- Validate SERV JSON with a strict schema before compiling it.
- The deterministic compiler remains the safety boundary; SERV is the reasoning layer, not the authority.

## 2. Replace fake Robinhood inputs with live data
`fetchStockPrice()` currently uses a hardcoded price matrix plus Math.random(). Remove that from production.

Implement live Robinhood REST reads for:
- `/rhj/assets`
- `/rhj/prices/{symbol}`
- `/rhj/corporate-actions`

Resolve the canonical Stock Token contract address from the asset registry and require `chain_id === 4663`.

Read onchain `uiMultiplier()` from that exact contract address.

Read the connected wallet's live `balanceOf()` and `allowance()`.

Never default failed onchain reads to `1.0x`, a fake balance, or a placeholder token address. Fail closed and show the reason.

## 3. Remove the fake defaults from `/api/serv/plan`
Eliminate:
- placeholder token address `0x111...`
- testnet default `46630`
- fake treasury balance
- hardcoded offchain multiplier `1.0`
- generated fallback recipients

The route should receive the connected wallet address and resolve the token address itself from the official Robinhood asset registry.

## 4. Make the UnitSeal state digest truthful
The seal must bind the complete state actually used for execution:
- chain id
- canonical token contract
- wallet / sender
- recipient
- action type
- raw amount
- target economic value
- expected multiplier
- quote timestamp / freshness bound
- bid / ask or execution reference used by the compiler
- trading capability
- corporate-action state / effective boundary
- expiry
- plan hash

The same canonical bytes must be used by offchain verification and the EIP-712 attestation.

## 5. Fix the production smart contract
`UnitSealGuard.sol` must be fail-closed.

Required changes:
- Remove production `mockMultiplier` functionality entirely, or isolate it in a test-only contract that is never deployed to mainnet.
- If `uiMultiplier()` staticcall fails, REVERT. Never return `1e18`.
- Require an explicit configured canonical Stock Token, or make the token address part of a verified allowlist that cannot silently be omitted.
- Bind the execution target and token exactly.
- Keep replay protection and expiry.
- Keep chain-id verification.
- Keep EIP-712 signature verification.
- Emit an explicit execution/refusal event with enough fields for auditability.
- Add invariant tests for staticcall failure and unconfigured token state.

Do not redeploy the existing contract as production if these fail-open paths remain.

## 6. Replace the fake execution path
`handleExecute()` currently signs a personal message and then creates a random browser-generated tx hash. Delete that behavior.

Real execution must be:
1. Obtain attestor EIP-712 signature from server.
2. Ensure browser wallet is on Robinhood Chain Mainnet `4663`.
3. Check allowance / request `approve(UnitSealGuard, amount)` if needed.
4. Request the wallet to sign the actual `executeSeal(attestation, signature)` transaction.
5. Wait for receipt with viem.
6. Parse the actual `SealExecuted` event.
7. Store/display the real transaction hash, block number, seal id, raw amount, expected/current multiplier and explorer URL.
8. On revert, decode the custom error and show the exact invariant that blocked execution.

The browser must never manufacture a transaction hash.

## 7. Wallet behavior
Use EIP-1193 / viem wallet client.

When the wallet connects:
- detect chain
- automatically request `wallet_switchEthereumChain` to `0x1237` (4663)
- if missing, request `wallet_addEthereumChain`
- never execute while the wallet is on another chain
- distinguish personal-sign authorization from the actual transaction; the latter must be the real contract call

The user should see a genuine wallet popup for the transaction.

## 8. UI truthfulness
Remove every hardcoded production-looking value that is not sourced live.

In particular:
- no fake `0x9999...` guard address
- no testnet `46630` label in production
- no fixed `2.4 seconds` quote age
- no fabricated "confirmed" receipt
- no fabricated transaction hash
- no static multiplier text when live value exists

The UI should show explicit stages:
`SERV → STATE → SEAL → HUMAN → EXECUTE`
with live status transitions.

## 9. Judge-facing break campaign
Keep the existing simulated multiplier break as a deterministic Judge Lab feature, but label it clearly as a simulation.

Also add one production-proof path:
- live preflight reads mainnet state
- create seal
- submit real transaction
- Blockscout receipt

The break path must never pretend that a simulated multiplier change happened to the real Stock Token.

## 10. Security cleanup — do immediately
Rotate every credential currently committed or exposed in repository history:
- SERV API key exposed in `EVIDENCE.md`
- attestor private key fallback in source
- any embedded Alchemy credential

Remove secrets from tracked files and history where practical.
Use `.env.local` / Vercel encrypted environment variables only.
Never place private keys under `NEXT_PUBLIC_*`.

After rotation, update `EVIDENCE.md` with redacted metadata only.

## 11. README correction
Keep the current thesis and structure. Add real embedded visual evidence:
- hero screenshot
- 4 product screenshots in a 2x2 grid
- live SERV compilation proof
- mainnet execution proof with real tx link
- Judge Lab break proof
- exact contract address + Blockscout link
- architecture Mermaid
- product flow Mermaid
- 2-minute exploration path
- security model
- reproducibility commands

Remove any claim that cannot be demonstrated from the deployed app/repository.

## 12. Required docs before submission
Create / update:
- TASK.md
- PROGRESS.md
- MILESTONE.md
- EVIDENCE.md
- PROOF.md
- SECURITY.md
- DISCOVERY.md

Each must contain actual evidence, not planned claims.

## 13. Tests / gates
Do not stop at unit tests.

Required gates:
- TypeScript build passes
- lint passes
- Solidity compilation passes
- contract tests pass
- SERV live smoke test passes
- Robinhood REST live smoke test passes
- onchain multiplier live smoke test passes
- wallet switch test passes
- actual mainnet executeSeal transaction succeeds with a deliberately tiny amount
- actual mainnet revert test is demonstrated with an invalid/stale seal
- Blockscout transaction verification exists
- Playwright tests desktop/tablet/mobile/iPhone/Android
- production UI contains zero placeholder values

## 14. Do not add features
No new trading strategies, analytics, charts, AI agents, social features, portfolio modules, or unrelated dashboards.

Depth comes from making the existing UnitSeal mechanism unquestionably real.

The final judge-facing sentence is:

"SERV decides what should happen. UNITSEAL proves the state it was approved against still exists. Robinhood Chain enforces the final check before capital moves."
