import { ethers } from "ethers";
import { config } from "./config";
import { signPayout, getOperatorAddress } from "./kmsSignerClient";

export interface PayoutParams {
  recipientAddress: string;
  tokenAddress?: string;
  amount: string; // token units or wei
}

export class PayoutOrchestrator {
  private provider: ethers.JsonRpcProvider;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.evmRpcUrl);
  }

  public async broadcastPayout(params: PayoutParams): Promise<{ txHash: string }> {
    const operatorAddress = await getOperatorAddress();
    const nonce = await this.provider.getTransactionCount(operatorAddress, "pending");
    const feeData = await this.provider.getFeeData();

    console.log(`[Payout] Initiating payout of ${params.amount} to ${params.recipientAddress} from ${operatorAddress}...`);

    const signedRes = await signPayout({
      chain_id: config.chainId,
      recipient_address: params.recipientAddress,
      amount: params.amount,
      token_address: params.tokenAddress,
      nonce,
      gas_limit: params.tokenAddress ? 100000 : 21000,
      gas_price: feeData.gasPrice ? Number(feeData.gasPrice) : 20000000000,
    });

    console.log(`[Payout] Broadcasting payout raw tx to network: ${signedRes.tx_hash}...`);
    const txResponse = await this.provider.broadcastTransaction(signedRes.raw_tx);
    console.log(`[Payout] Broadcast successful: ${txResponse.hash}`);

    return { txHash: txResponse.hash };
  }
}

export const payoutOrchestrator = new PayoutOrchestrator();
