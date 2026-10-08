import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "8007", 10),
  evmRpcUrl: process.env.EVM_RPC_URL || "http://localhost:8545",
  chainId: parseInt(process.env.CHAIN_ID || "31337", 10),
  backendApiUrl: process.env.BACKEND_API_URL || "http://localhost:8005",
  kmsSignerUrl: process.env.KMS_SIGNER_URL || "http://localhost:8006",
  internalSecret: process.env.INTERNAL_API_SECRET || "kompat-crypto-internal-secret-dev-2026",
  forwarderFactoryAddress: process.env.FORWARDER_FACTORY_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  corporateMasterWallet: process.env.CORPORATE_MASTER_WALLET || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  payoutHotWallet: process.env.PAYOUT_HOT_WALLET || "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || "2000", 10),
  confirmationsRequired: parseInt(process.env.CONFIRMATIONS_REQUIRED || "1", 10),
};
