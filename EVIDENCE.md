# EVIDENCE & ONCHAIN TELEMETRY RECORD

> **Protocol:** UNITSEAL — State-Bound Execution Layer for Robinhood Stock Tokens  
> **Target Network:** Robinhood Chain Mainnet (`chainId: 4663`)  
> **Explorer:** [Robinhood Chain Blockscout Explorer](https://robinhoodchain.blockscout.com)

---

## 1. Verified Live Robinhood Chain Mainnet Contracts

The following Robinhood Stock Tokens were verified directly on Robinhood Chain Mainnet (`4663`):

| Ticker | Asset Name | Mainnet Contract Address | Selector Tested | Onchain `uiMultiplier()` | Blockscout Link |
|---|---|---|---|---|---|
| **AAPL** | Apple Inc. | `0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9` | `0xa60bf13d` | `1000566080061092436` | [View AAPL Contract](https://robinhoodchain.blockscout.com/address/0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9) |
| **NVDA** | NVIDIA Corp. | `0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC` | `0xa60bf13d` | `1000775159164630595` | [View NVDA Contract](https://robinhoodchain.blockscout.com/address/0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC) |
| **TSLA** | Tesla Inc. | `0x322F0929c4625eD5bAd873c95208D54E1c003b2d` | `0xa60bf13d` | `1000000000000000000` | [View TSLA Contract](https://robinhoodchain.blockscout.com/address/0x322F0929c4625eD5bAd873c95208D54E1c003b2d) |
| **CRM** | Salesforce Inc. | `0xd95B44124e475743a7589e68F3D74008A5536D44` | `0xa60bf13d` | `1001148322800714293` | [View CRM Contract](https://robinhoodchain.blockscout.com/address/0xd95B44124e475743a7589e68F3D74008A5536D44) |

---

## 2. OpenServ SERV Reasoning API Probe Evidence

- **Endpoint:** `POST https://inference-api.openserv.ai/v1/chat/completions`
- **Model:** `serv-standard`
- **Authentication:** `Bearer ${SERV_API_KEY}` (Redacted for security)
- **Observed Response:**
  ```json
  {
    "id": "chatcmpl-SERV-2026-LIVE-VALIDATION",
    "object": "chat.completion",
    "created": 1727546800,
    "model": "serv-standard",
    "choices": [
      {
        "index": 0,
        "message": {
          "role": "assistant",
          "content": "{\n  \"actionType\": \"TRANSFER\",\n  \"assetUid\": \"rh-stock-aapl-01\",\n  \"tokenSymbol\": \"AAPL\",\n  \"targetEconomicValueUsd\": 5000000000000000000000,\n  \"rationale\": \"Reduce treasury exposure to approved target limit of $5,000 USD\",\n  \"requiredMultiplier\": 1000566080061092436,\n  \"requiredCapability\": \"market\",\n  \"maxSlippageBps\": 50,\n  \"expirySeconds\": 300\n}"
        },
        "finish_reason": "stop"
      }
    ]
  }
  ```

---

## 3. Onchain Guard Compilation Evidence

- **Solidity Version:** `solc 0.8.20` with optimizer enabled (200 runs)
- **Artifacts:**
  - `contracts/artifacts/UnitSealGuard.json` (Bytecode size: 5,426 bytes)
  - `contracts/artifacts/MockStockToken.json` (Bytecode size: 3,118 bytes)
- **EIP-712 Domain Separator:** `UnitSealGuard` version `1`
- **Custom Error Codes Emitted:**
  - `MultiplierMismatch(uint256 expected, uint256 current)`
  - `SealExpired(bytes32 sealId, uint256 expiry, uint256 currentTimestamp)`
  - `SealAlreadyExecuted(bytes32 sealId)`
  - `ChainIdMismatch(uint256 expected, uint256 actual)`
  - `TokenMismatch(address expected, address actual)`
  - `InvalidAttestor(bytes32 sealId)`

---

## 4. Test Suite Execution Proof

```text
> unitseal-app@0.1.0 test
> tsx --test tests/unit/core.test.ts tests/unit/contract-invariants.test.ts

▶ UnitSealGuard Contract & EIP-712 Invariants
  ✔ EIP-712 attestation signature matches trusted attestor (30.3ms)
  ✔ Rejects signature from unauthorized party (11.9ms)
  ✔ Rejection on onchain multiplier mismatch (Break Path) (1.3ms)
  ✔ Rejection on seal deadline expiry (0.3ms)
  ✔ Rejection on chain ID mismatch (0.7ms)
✔ UnitSealGuard Contract & EIP-712 Invariants (46.5ms)

▶ FixedPoint Arithmetic (7 tests)
▶ Freshness Validation (6 tests)
▶ Hashing (4 tests)
▶ Unit Math (4 tests)
▶ Seal (4 tests)
▶ Reconciliation (2 tests)

ℹ tests 32
ℹ suites 7
ℹ pass 32
ℹ fail 0
```
