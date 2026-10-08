# KOMPAT Crypto Custody Microservice

Daemon Block Listener & Sweep Orchestrator for the KOMPAT Custodial Ecosystem.

## Features
- **Real-Time Block Listener:** Monitors EVM / TRON blocks for ERC-20 / TRC-20 and native deposit events to user counterfactual CREATE2 addresses.
- **Immediate Ledger Credit:** Notifies `kompat-backend` with atomic verification to immediately credit user fiat/crypto ledger.
- **Batch Sweep Orchestration:** Employs `ForwarderFactory.batchSweepToken` via `kompat-kms-signer` to batch forward funds to the institutional Corporate Master Wallet in one single gas-optimized transaction.
- **Internal Spread Profit Accounting:** Records the gas spread (`estimated_gas - actual_sweep_gas`) as platform operational profit.
- **Secure Payout Orchestration:** Handles external withdrawal broadcasts from Hot Wallets signed by AWS KMS.

## Endpoints
- `GET /health`
- `POST /tracking/register`
- `POST /sweep/enqueue`
- `POST /sweep/trigger`
- `POST /payout/broadcast`
