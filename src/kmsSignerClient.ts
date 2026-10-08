import axios from "axios";
import { config } from "./config";

const client = axios.create({
  baseURL: config.kmsSignerUrl,
  headers: {
    "X-Internal-Secret": config.internalSecret,
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

export interface SignEvmResponse {
  raw_tx: string;
  tx_hash: string;
  r: string;
  s: string;
  v: number;
}

export async function getOperatorAddress(): Promise<string> {
  const res = await client.get<{ operator_address: string }>("/operator-address");
  return res.data.operator_address;
}

export async function signSweepBatch(params: {
  chain_id: number;
  token_address: string;
  salts: string[];
  recipient: string;
  nonce: number;
  gas_limit?: number;
  gas_price?: number;
  max_fee_per_gas?: number;
  max_priority_fee_per_gas?: number;
}): Promise<SignEvmResponse> {
  const res = await client.post<SignEvmResponse>("/sign/sweep-batch", params);
  return res.data;
}

export async function signPayout(params: {
  chain_id: number;
  recipient_address: string;
  amount: number | string;
  token_address?: string;
  nonce: number;
  gas_limit?: number;
  gas_price?: number;
  max_fee_per_gas?: number;
  max_priority_fee_per_gas?: number;
}): Promise<SignEvmResponse> {
  const res = await client.post<SignEvmResponse>("/sign/payout", params);
  return res.data;
}
