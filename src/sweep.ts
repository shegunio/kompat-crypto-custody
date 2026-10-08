import { ethers } from "ethers";
import { config } from "./config";
import { signSweepBatch, getOperatorAddress } from "./kmsSignerClient";
import { notifySweepStatus } from "./backendClient";

export interface PendingSweepItem {
  depositTxHash: string;
  depositAddress: string;
  salt: string;
  tokenAddress: string;
}

export class SweepOrchestrator {
  private provider: ethers.JsonRpcProvider;
  private isSweeping: boolean = false;
  private sweepQueue: PendingSweepItem[] = [];

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.evmRpcUrl);
  }

  public enqueueSweep(item: PendingSweepItem) {
    this.sweepQueue.push(item);
    console.log(`[Sweep] Enqueued forwarder for sweep: ${item.depositAddress} (salt: ${item.salt})`);
  }

  public async executeBatchSweep(tokenAddress: string): Promise<string | null> {
    if (this.isSweeping) {
      console.log("[Sweep] Sweep execution already in progress, skipping.");
      return null;
    }

    const itemsToSweep = this.sweepQueue.filter((it) => it.tokenAddress.toLowerCase() === tokenAddress.toLowerCase());
    if (itemsToSweep.length === 0) {
      return null;
    }

    this.isSweeping = true;
    try {
      const operatorAddress = await getOperatorAddress();
      const nonce = await this.provider.getTransactionCount(operatorAddress, "pending");
      const feeData = await this.provider.getFeeData();

      const salts = itemsToSweep.map((it) => it.salt);
      console.log(`[Sweep] Orchestrating batch sweep for ${salts.length} forwarders to ${config.corporateMasterWallet}...`);

      const signedRes = await signSweepBatch({
        chain_id: config.chainId,
        token_address: tokenAddress,
        salts,
        recipient: config.corporateMasterWallet,
        nonce,
        gas_limit: 100000 + salts.length * 50000,
        gas_price: feeData.gasPrice ? Number(feeData.gasPrice) : 20000000000,
      });

      console.log(`[Sweep] Broadcasting signed batch sweep tx: ${signedRes.tx_hash}...`);
      const txResponse = await this.provider.broadcastTransaction(signedRes.raw_tx);
      const receipt = await txResponse.wait(1);

      if (!receipt || receipt.status !== 1) {
        throw new Error(`Sweep tx ${signedRes.tx_hash} failed on-chain`);
      }

      const totalGasCostWei = receipt.gasUsed * (receipt.gasPrice || 0n);
      const perItemGasCost = ethers.formatEther(totalGasCostWei / BigInt(itemsToSweep.length));

      console.log(`[Sweep] Batch sweep succeeded! Tx: ${receipt.hash}, Total gas used: ${receipt.gasUsed.toString()}, Per-item gas: ${perItemGasCost} ETH`);

      // Notify backend for each swept deposit
      for (const item of itemsToSweep) {
        try {
          await notifySweepStatus({
            deposit_tx_hash: item.depositTxHash,
            sweep_tx_hash: receipt.hash,
            actual_sweep_gas_cost: perItemGasCost,
            sweep_status: "swept",
          });
        } catch (backendErr: any) {
          console.error(`[Sweep] Failed to update backend sweep status for ${item.depositTxHash}: ${backendErr.message}`);
        }
      }

      // Remove swept items from queue
      const sweptHashes = new Set(itemsToSweep.map((i) => i.depositTxHash));
      this.sweepQueue = this.sweepQueue.filter((i) => !sweptHashes.has(i.depositTxHash));

      return receipt.hash;
    } catch (err: any) {
      console.error(`[Sweep] Error executing batch sweep: ${err.message}`);
      return null;
    } finally {
      this.isSweeping = false;
    }
  }
}

export const sweepOrchestrator = new SweepOrchestrator();
