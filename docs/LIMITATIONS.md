# UNITSEAL Limitations

## Scope Limitations

### What UnitSeal Is
- A state-bound execution layer for agent-generated Stock Token actions
- An execution integrity system that binds actions to verified economic state
- A two-boundary verification system (offchain reconciliation + onchain enforcement)

### What UnitSeal Is NOT
- An investment prediction engine
- A trading strategy generator
- A portfolio management system
- A market-making system
- A guarantee of profitable execution
- A replacement for user judgment

## Technical Limitations

### Robinhood Chain Dependency
- Requires Robinhood Chain Stock Token infrastructure
- Depends on `uiMultiplier()` being implemented on target tokens
- Requires accessible RPC endpoints
- Testnet vs mainnet may have different available tokens

### Data Freshness
- REST endpoints are cached with unknown freshness
- Quote age is observed, not guaranteed
- Onchain state is authoritative but may have propagation delay
- Corporate action timing depends on issuer announcements

### Attestor Trust
- Attestor key requires secure custody
- Compromised attestor could sign invalid seals
- No multi-sig attestor in current implementation
- Key rotation requires contract owner action

### SERV Dependency
- Requires SERV Reasoning API availability
- SERV interprets intent but does not guarantee correctness
- Manual plan creation possible but less convenient
- API rate limits may apply

### Execution Scope
- Currently designed for TRANSFER and REBALANCE actions
- Does not handle complex multi-step transactions
- Single-token actions only (no basket execution)
- No limit order or conditional execution

### Gas and Cost
- Testnet gas required for demonstration
- Mainnet execution requires ETH for gas
- Multiple state reads increase gas usage
- Attestor signature verification adds gas cost

## Verification Limitations

### Offchain Verification
- REST data may be cached or delayed
- Quote freshness is best-effort
- Trading capability may change between check and execution

### Onchain Verification
- Only verifies multiplier at execution time
- Does not predict future multiplier changes
- Cannot prevent changes between block inclusion and confirmation

### Time Window
- Seal expiry creates a time window for state changes
- Short expiry limits planning flexibility
- Long expiry increases exposure to state drift

## User Experience Limitations

### Human in the Loop
- Requires human approval for each execution
- Not suitable for fully autonomous high-frequency operations
- User must understand what they are approving

### Wallet Requirements
- Requires EVM-compatible wallet with Robinhood Chain support
- User must manage their own keys
- No custodial option in current design

### Learning Curve
- Users must understand Stock Token multiplier mechanics
- Users must understand seal concept
- Not a plug-and-play solution for non-technical users

## Future Limitations (Not Yet Implemented)

- Multi-token portfolio actions
- Advanced policy engine
- Attestor delegation
- Historical seal analysis
- Integration with other RWA infrastructures
- Mainnet deployment
- Formal verification of contract

## Known Risks

1. **State drift during signing:** User may sign while state is changing
2. **RPC manipulation:** Malicious RPC could return false state
3. **Front-running:** Other actors may see pending transactions
4. **Bridge risk:** If tokens bridge to other chains, UnitSeal does not apply
5. **Corporate action surprise:** Unexpected corporate actions may invalidate seals

These limitations are inherent to the problem space and are documented for transparency, not as defects in the implementation.
