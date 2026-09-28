# UNITSEAL Proof Campaign

## Live State Verification

Show:
- Chain ID
- Token address
- Current multiplier (offchain)
- Current multiplier (onchain)
- Quote timestamp
- Quote age
- Trading capability
- Corporate action status
- State digest

## Happy Path

1. Connect wallet
2. Select Stock Token
3. Request action via SERV
4. Review structured plan
5. Verify state reconciliation
6. Create UnitSeal
7. Human review and sign
8. Execute onchain
9. Show transaction hash and explorer link

## Break Path — Stale State Attack

### Attack 1: Multiplier Change After Seal

```
SEAL STATE
  Seal ID:        0x...
  Expected mult:  1.000000000000000000
  Seal created:   2026-09-28T...
  Expires at:     2026-09-28T...

ATTACK
  Current multiplier:  0.500000000000000000
  Change source:       Injected state drift

RESULT = REFUSED
  Reason:  Onchain multiplier (0.5) != expected multiplier (1.0)
  Action:  Refresh state → recompile plan → reseal
```

### Attack 2: Token Address Change

```
SEAL STATE
  Expected token:  0xABC...
  
ATTACK
  Execution token: 0xDEF...

RESULT = REFUSED
  Reason:  Token address mismatch
```

### Attack 3: Recipient Change

```
SEAL STATE
  Expected recipient: 0x123...
  
ATTACK
  Execution recipient: 0x456...

RESULT = REFUSED
  Reason:  Recipient mismatch
```

### Attack 4: Amount Change

```
SEAL STATE
  Expected amount:  4,281.30 tokens
  
ATTACK
  Execution amount: 5,000.00 tokens

RESULT = REFUSED
  Reason:  Amount mismatch
```

### Attack 5: Chain ID Change

```
SEAL STATE
  Expected chain:  46630 (Testnet)
  
ATTACK
  Execution chain: 4663 (Mainnet)

RESULT = REFUSED
  Reason:  Chain ID mismatch
```

### Attack 6: Seal Expiry

```
SEAL STATE
  Created at:  2026-09-28T10:00:00Z
  Expires at:  2026-09-28T10:01:00Z

ATTACK
  Execute at:  2026-09-28T10:01:30Z

RESULT = REFUSED
  Reason:  Seal expired
```

### Attack 7: Replay

```
SEAL STATE
  Seal ID:  0x...
  Status:   EXECUTED

ATTACK
  Re-submit same seal

RESULT = REFUSED
  Reason:  Seal already consumed
```

### Attack 8: Stale Quote

```
SEAL STATE
  Quote generated:  2026-09-28T10:00:00Z
  Max age:          30 seconds

ATTACK
  Current time:     2026-09-28T10:00:45Z
  Quote age:        45 seconds

RESULT = HOLD / RECHECK
  Reason:  Quote exceeds maximum age
```

### Attack 9: Pending Multiplier

```
SEAL STATE
  Current multiplier:    1.0
  Pending multiplier:    2.0
  Pending effective:     2026-09-28T11:00:00Z

ATTACK
  Plan approved without acknowledging pending change

RESULT = HOLD / RECHECK
  Reason:  Pending corporate action detected
```

### Attack 10: User Rejection

```
ATTACK
  User cancels wallet signature

RESULT = NO STATE CHANGE
  Reason:  User rejected signature
  Note:    No transaction submitted
```

### Attack 11: RPC Unavailable

```
ATTACK
  Robinhood Chain RPC unavailable

RESULT = FAIL CLOSED
  Reason:  Cannot verify onchain state
  Action:  No transaction submitted
  Note:    No fake success returned
```

## Recovery Flow

After any refusal:
1. Re-read state from all sources
2. Reconcile offchain and onchain data
3. Recompute raw amount from target economic value
4. Create new UnitSeal
5. Human reviews new seal
6. Sign and execute

```
NEW STATE
  Multiplier:      0.500000000000000000
  Quote age:       3.1 s
  Capability:      tradable
  Corporate act:   none pending

NEW SEAL
  Seal ID:         0x...
  Expected mult:   0.500000000000000000
  Raw amount:      8,562.60 tokens
  Expires in:      30 s

NEW TRANSACTION
  Tx hash:         0x...
  Explorer:        https://explorer.testnet.chain.robinhood.com/tx/0x...

RESULT = EXECUTED
```
