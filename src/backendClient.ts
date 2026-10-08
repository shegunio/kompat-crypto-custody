import axios from "axios";
import { config } from "./config";

const client = axios.create({
  baseURL: config.backendApiUrl,
  headers: {
    "X-Internal-Secret": config.internalSecret,
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

export interface DepositWebhookPayload {
  deposit_address: string;
  tx_hash: string;
  currency_code: string;
  network_code: string;
  amount: string;
  block_number?: number;
  estimated_gas_cost?: string;
}

export interface SweepStatusPayload {
  deposit_tx_hash: string;
  sweep_tx_hash: string;
  actual_sweep_gas_cost: string;
  sweep_status?: "swept" | "failed";
}

export async function notifyDepositWebhook(payload: DepositWebhookPayload): Promise<any> {
  const url = "/api/v2/cryptocurrency/internal/deposit-webhook/";
  const res = await client.post(url, payload);
  return res.data;
}

export async function notifySweepStatus(payload: SweepStatusPayload): Promise<any> {
  const url = "/api/v2/cryptocurrency/internal/sweep-status/";
  const res = await client.post(url, payload);
  return res.data;
}
