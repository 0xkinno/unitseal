# UNITSEAL Security Model

## Threat Model

### Threat 1 — Stale Approval

**Description:** A user approves an action and the state changes before execution.

**Risk:** The action executes under different economic conditions than the user reviewed.

**Defense:** 
- Seal expiry (short time window)
- Final onchain state check at execution time
- Explicit refusal when state mismatch detected

### Threat 2 — Replay

**Description:** An old valid authorization is submitted again after the original execution.

**Risk:** Double execution of the same action.

**Defense:**
- Seal nonce / consumed seal tracking onchain
- Each seal can only execute once
- Seal ID included in execution payload

### Threat 3 — Parameter Substitution

**Description:** A valid seal is reused with different recipient, amount, or token.

**Risk:** Funds sent to wrong destination or in wrong quantity.

**Defense:**
- Complete payload binding in attestation
- Token address, recipient, amount all bound to seal
- Onchain verification of all parameters

### Threat 4 — Offchain/Onchain Disagreement

**Description:** REST API reports one state while chain reports another.

**Risk:** Action approved based on stale or incorrect offchain data.

**Defense:**
- Explicit reconciliation between offchain and onchain state
- Final onchain read at execution time
- Multiplier parity check between REST and onchain
- Fail closed when disagreement detected

### Threat 5 — Compromised Attestor

**Description:** Attestor key used to sign invalid seals.

**Risk:** Invalid seals could be created if attestor is compromised.

**Mitigations:**
- Least-privileged attestor (no fund custody)
- Short seal expiry limits window of abuse
- Emergency attestor rotation via contract owner
- Explicit contract owner controls
- Documented trust assumptions

**Note:** The attestor only certifies that offchain checks passed. The user's wallet remains the authority that signs the final transaction. The attestor cannot execute transactions independently.

### Threat 6 — Wallet Rejection

**Description:** User cancels or rejects the transaction in their wallet.

**Risk:** User might think action executed when it did not.

**Defense:**
- No optimistic success UI
- Transaction status remains pending/rejected until actual chain result
- Clear user-facing messages for rejection
- No false "success" states

### Threat 7 — RPC Failure

**Description:** Robinhood Chain RPC unavailable during execution.

**Risk:** Execution appears to succeed when it did not, or fails silently.

**Defense:**
- Fail closed: no fake success
- Wait for actual chain confirmation
- Clear error messages when RPC unavailable
- No silent fallback to unverified state

### Threat 8 — Quote Manipulation

**Description:** Offchain price feed returns manipulated or outdated data.

**Risk:** Wrong amount calculated from bad price data.

**Defense:**
- Quote freshness validation
- Maximum quote age enforcement
- Onchain oracle as additional verification source
- Explicit distinction between quote generation time and observation time

## Security Assumptions

1. **User wallet security:** User is responsible for wallet security and signature decisions.
2. **Attestor integrity:** Attestor key must be secured by the operator. UnitSeal does not protect against a compromised attestor signing intentionally invalid seals.
3. **Robinhood Chain integrity:** The system assumes Robinhood Chain and its Stock Token contracts function as documented.
4. **SERV API availability:** SERV Reasoning API must be available for plan generation. UnitSeal can still function with manually created plans.
5. **RPC availability:** Final execution requires accessible Robinhood Chain RPC.

## What UnitSeal Does NOT Protect Against

- User error in intent expression
- Malicious intent (garbage in, garbage out)
- Smart contract bugs in underlying Stock Token
- Robinhood Chain consensus failures
- Wallet malware or compromised user device
- Social engineering of the human approver
- Attacks on the attestor key storage

## Operational Security

### Key Management
- Attestor private key must never be exposed to frontend
- Use separate deployer wallet for contract deployment
- Use separate attestor wallet with no user funds
- Rotate attestor key periodically and on suspicion

### Access Control
- Contract owner can rotate attestor
- Consider multi-sig for production attestor management
- Log all attestation events for audit

### Monitoring
- Monitor attestation events
- Alert on unusual seal patterns
- Track failed execution attempts
- Monitor RPC health

## Audit Considerations

For production use, UnitSeal should undergo:
- Smart contract audit (UnitSealGuard)
- Security review of attestation flow
- Penetration testing of API layer
- Review of key management procedures
