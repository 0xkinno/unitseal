# SECURITY & THREAT MODEL

> **Protocol:** UNITSEAL — State-Bound Execution Layer  
> **Network:** Robinhood Chain Mainnet (`chainId: 4663`)  
> **Contract:** `UnitSealGuard.sol`

---

## 1. Security Architecture Principles

1. **Two-Boundary Verification:**
   - **Boundary A (Offchain / Deterministic Engine):** Validates REST quote freshness, corporate action calendar, trading session capabilities, and arithmetic scaling.
   - **Boundary B (Onchain Guard / EVM):** Cryptographically verifies EIP-712 attestation, replay protection, deadline, and staticcalls the live ERC-8056 `uiMultiplier()`.
2. **Least-Privilege Attestor:**
   - The attestor private key signs cryptographic certifications offchain.
   - **The attestor never has custody of user or treasury funds.**
   - Funds can only be moved with explicit signature from the user's connected wallet (`msg.sender` in `executeSeal`).
3. **Fail-Closed Execution:**
   - Any state anomaly, RPC failure, signature failure, or arithmetic discrepancy immediately halts execution.
   - The system never defaults to optimistic continuation.

---

## 2. Threat Analysis & Mitigations

### Threat 1: Stale Human Approval
- **Scenario:** An operator approves a transfer based on an active quote or market condition. Due to network congestion or operator delay, hours pass before execution.
- **Attack/Fault:** Market prices or multipliers shift significantly in the interim.
- **Mitigation:**
  - `expiresAt` timestamp embedded into both the seal and the EIP-712 attestation (default: 300 seconds).
  - `UnitSealGuard.sol` checks `block.timestamp > attestation.expiry` and reverts with `SealExpired`.

### Threat 2: Transaction Replay
- **Scenario:** An attacker intercepts a previously valid seal attestation and broadcasts it multiple times to drain funds.
- **Mitigation:**
  - Every seal has a unique `sealId = keccak256(planHash, stateHash, observedAt)`.
  - `UnitSealGuard.sol` marks `executedSeals[sealId] = true` in permanent contract storage.
  - Subsequent submissions revert with `SealAlreadyExecuted`.

### Threat 3: Parameter Substitution (Amount / Recipient / Token)
- **Scenario:** An attacker captures a signed seal and substitutes their own wallet as `recipient` or increases `rawAmount`.
- **Mitigation:**
  - The EIP-712 `SealAttestation` typehash binds `token`, `recipient`, `rawAmount`, `expectedMultiplier`, `planHash`, and `stateHash`.
  - Altering any field changes the EIP-712 digest: `ECDSA.recover(digest, signature)` produces an address that does not match the trusted attestor, reverting with `InvalidAttestor`.

### Threat 4: Offchain vs Onchain State Disagreement (Mempool Drift)
- **Scenario:** The offchain API reports a multiplier of $1.0\times$, but an onchain transaction updated `uiMultiplier()` to $0.5\times$ prior to execution.
- **Mitigation:**
  - `UnitSealGuard.sol` executes a synchronous staticcall to `token.uiMultiplier()` (`0xa60bf13d`) directly inside the execution transaction.
  - If `token.uiMultiplier() != attestation.expectedMultiplier`, the transaction reverts immediately with `MultiplierMismatch`.

### Threat 5: Compromised Attestor Key
- **Scenario:** An attacker obtains the server-side attestor key.
- **Mitigation:**
  - The attestor key cannot transfer funds on its own. Funds can only be moved when `msg.sender` (the user) authorizes the transfer.
  - Contract owner can immediately invoke `setAttestor(newAttestor)` to rotate the trusted signing address.
  - Short expiry times limit the window of any forged attestation.

### Threat 6: User Wallet Cancellation / Rejection
- **Scenario:** The user rejects the wallet transaction popup or cancels in MetaMask.
- **Mitigation:**
  - Clean error capture (EIP-1193 error code 4001).
  - No optimistic UI updates or simulated transaction hashes.
  - The plan remains unexecuted in the journal with state `UNAUTHORIZED`.

---

## 3. Cryptographic Primitives
- **Hashing:** Keccak-256 (`viem/keccak256`)
- **Signatures:** EIP-712 Typed Data v4 (compatible with OpenZeppelin `EIP712.sol` and `ECDSA.sol`)
- **Arithmetic:** Fixed-point 18-decimal integer arithmetic (0 floating point in load-bearing calculations)
