# UNITSEAL Sources

## Official Robinhood Chain Documentation

| Claim | Source |
|-------|--------|
| Stock Tokens are ERC-20s | https://docs.robinhood.com/chain/stock-tokens/ |
| Each Stock Token has onchain Chainlink price feed | https://docs.robinhood.com/chain/stock-tokens/ |
| Corporate actions via onchain multiplier `uiMultiplier()` | https://docs.robinhood.com/chain/stock-tokens/ |
| Raw balance can stay static while shares-per-token changes | https://docs.robinhood.com/chain/stock-tokens/ |
| REST `/prices/{symbol}` exposes raw underlying-equity bid/ask | https://docs.robinhood.com/chain/stock-token-apis/ |
| `/prices/{symbol}` is NOT multiplier-adjusted | https://docs.robinhood.com/chain/stock-token-apis/ |
| `/assets` exposes currentMultiplier, pendingMultiplier, pendingMultiplierEffectiveTime | https://docs.robinhood.com/chain/stock-token-apis/ |
| REST endpoints are cached with endpoint-specific freshness | https://docs.robinhood.com/chain/stock-token-apis/ |
| Trading capabilities can differ by session | https://docs.robinhood.com/chain/stock-token-apis/ |
| Mainnet chain ID: 4663 | https://docs.robinhood.com/chain/connecting/ |
| Testnet chain ID: 46630 | https://docs.robinhood.com/chain/connecting/ |
| Public mainnet RPC: https://rpc.mainnet.chain.robinhood.com | https://docs.robinhood.com/chain/connecting/ |
| Public testnet RPC: https://rpc.testnet.chain.robinhood.com | https://docs.robinhood.com/chain/connecting/ |
| ETH is the currency | https://docs.robinhood.com/chain/connecting/ |

## Official SERV Documentation

| Claim | Source |
|-------|--------|
| SERV Reasoning API | https://docs.openserv.ai/serv-reasoning/day-one |
| Why SERV | https://docs.openserv.ai/serv-reasoning/why |
| API chat completions | https://docs.openserv.ai/serv-reasoning/api/chat-completions |
| Inference API base URL | https://inference-api.openserv.ai/v1 |
| OpenServ homepage | https://www.openserv.ai/ |
| Hackathon page | https://www.openserv.ai/hackathon |

## Hackathon Context

| Claim | Source |
|-------|--------|
| SERV Edition 01 has four tracks: Mainnet & MCP, AgentKit, RWA Vaults, Open Track | https://www.openserv.ai/hackathon |
| Mainnet & MCP track is for agents acting on Robinhood Chain or via Robinhood MCP | https://www.openserv.ai/hackathon |
| Judging criteria: creativity, user-readiness, revenue potential | https://www.openserv.ai/hackathon |
| Submissions close September 28th 00:00 UTC | https://www.openserv.ai/hackathon |

## Research Samples (Studied, Not Copied)

### SERV Samples
- https://github.com/mystiquemide/ebbryn.git
- https://github.com/mrnetwork0001/Judr
- https://github.com/Mhiah/crux.git
- https://github.com/fozagtx/seeri
- https://github.com/iam25th1/servpit

### Technical/Reference Builds
- https://github.com/0xkinno/pharos
- https://github.com/Enoch208/canon
- https://github.com/winsznx/night-shift.git

### Sponsor Infrastructure
- https://github.com/hydra-db/hydradb
- https://github.com/coinbase/agentkit
- https://github.com/IXS-Finance/ixs-rwa-agent-skills

## Standards Referenced

| Standard | Usage |
|----------|-------|
| EIP-712 | Typed data attestation for UnitSeal |
| ERC-20 | Stock Token token standard |
| EVM | Execution environment for UnitSealGuard |

## Library Documentation

| Library | Version | Purpose |
|---------|---------|---------|
| Next.js | 15+ | Application framework |
| React | 19+ | UI library |
| TypeScript | 5+ | Type-safe development |
| Wagmi | 2+ | Wallet connection |
| Viem | 2+ | EVM interaction |
| Ethers.js | 6+ | Contract interaction |
| Solidity | 0.8+ | Smart contract language |
| Foundry | latest | Contract testing |
| Tailwind CSS | 4+ | Styling |
| Framer Motion | latest | Animations |
