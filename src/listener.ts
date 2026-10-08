import { ethers } from "ethers";
import { config } from "./config";
import { notifyDepositWebhook } from "./backendClient";

export interface TrackedDepositAddress {
  address: string;
  userId: number;
  currencyCode: string;
  networkCode: string;
  salt: string;
}

export class BlockchainListener {
  private provider: ethers.JsonRpcProvider;
  private lastScannedBlock: number = 0;
  private isScanning: boolean = false;
  private trackedAddresses: Map<string, TrackedDepositAddress> = new Map();

  // Standard ERC20 Transfer event topic: keccak256("Transfer(address,address,uint256)")
  private readonly TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.evmRpcUrl);
  }

  public registerAddress(tracked: TrackedDepositAddress) {
    const normalized = tracked.address.toLowerCase();
    this.trackedAddresses.set(normalized, tracked);
    console.log(`[Listener] Registered deposit address for tracking: ${tracked.address} (User ${tracked.userId})`);
  }

  public getTrackedAddress(address: string): TrackedDepositAddress | undefined {
    return this.trackedAddresses.get(address.toLowerCase());
  }

  public getAllTrackedAddresses(): TrackedDepositAddress[] {
    return Array.from(this.trackedAddresses.values());
  }

  public async start() {
    try {
      this.lastScannedBlock = await this.provider.getBlockNumber();
      console.log(`[Listener] Started listening on ${config.evmRpcUrl}. Current block: ${this.lastScannedBlock}`);
    } catch (err) {
      console.warn(`[Listener] Could not reach EVM RPC at ${config.evmRpcUrl}: ${err}. Will retry...`);
      this.lastScannedBlock = 0;
    }

    setInterval(() => {
      this.scanNewBlocks().catch((err) => {
        console.error(`[Listener] Error scanning blocks: ${err.message}`);
      });
    }, config.pollIntervalMs);
  }

  public async scanNewBlocks() {
    if (this.isScanning) return;
    this.isScanning = true;

    try {
      const currentBlock = await this.provider.getBlockNumber();
      if (currentBlock <= this.lastScannedBlock) {
        this.isScanning = false;
        return;
      }

      const fromBlock = this.lastScannedBlock === 0 ? currentBlock : this.lastScannedBlock + 1;
      const toBlock = currentBlock;

      // Scan ERC20 Transfer logs
      const logs = await this.provider.getLogs({
        fromBlock,
        toBlock,
        topics: [this.TRANSFER_TOPIC],
      });

      for (const log of logs) {
        if (!log.topics[2]) continue;
        const toAddressHex = "0x" + log.topics[2].slice(26);
        const normalizedTo = toAddressHex.toLowerCase();

        const tracked = this.trackedAddresses.get(normalizedTo);
        if (tracked) {
          const rawAmount = BigInt(log.data);
          // Defaulting to 6 decimals (USDT/USDC) or 18 decimals based on token
          const amountFormatted = ethers.formatUnits(rawAmount, 6);

          console.log(`[Listener] Inbound ERC20 deposit detected! Tx: ${log.transactionHash}, Address: ${tracked.address}, Amount: ${amountFormatted}`);

          try {
            await notifyDepositWebhook({
              deposit_address: tracked.address,
              tx_hash: log.transactionHash,
              currency_code: tracked.currencyCode,
              network_code: tracked.networkCode,
              amount: amountFormatted,
              block_number: log.blockNumber,
              estimated_gas_cost: "0.00065", // Standard single forwarder gas estimate
            });
            console.log(`[Listener] Deposit credited to user ledger in backend: Tx ${log.transactionHash}`);
          } catch (backendErr: any) {
            console.error(`[Listener] Failed to notify backend of deposit: ${backendErr.message}`);
          }
        }
      }

      this.lastScannedBlock = toBlock;
    } catch (err: any) {
      console.error(`[Listener] Scan error: ${err.message}`);
    } finally {
      this.isScanning = false;
    }
  }
}

export const blockchainListener = new BlockchainListener();
