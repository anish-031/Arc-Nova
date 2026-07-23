/**
 * Direct JSON-RPC + Arcscan (Etherscan-compatible) helpers.
 * Works without a connected wallet so the tools page can look up any address.
 */
import { ARC_TESTNET } from "@/lib/arc";

const RPC = ARC_TESTNET.rpcUrl;
const SCAN = `${ARC_TESTNET.explorer}/api`;

let rpcId = 1;
export async function rpc<T = unknown>(method: string, params: unknown[] = []): Promise<T> {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: rpcId++, method, params }),
  });
  if (!res.ok) throw new Error(`RPC ${method} HTTP ${res.status}`);
  const j = (await res.json()) as { result?: T; error?: { message?: string } };
  if (j.error) throw new Error(j.error.message || `RPC ${method} failed`);
  return j.result as T;
}

export async function getBalanceWei(address: string): Promise<bigint> {
  const hex = await rpc<string>("eth_getBalance", [address, "latest"]);
  return BigInt(hex);
}

export async function getTxCount(address: string): Promise<number> {
  const hex = await rpc<string>("eth_getTransactionCount", [address, "latest"]);
  return parseInt(hex, 16);
}

export async function getBlockNumber(): Promise<number> {
  const hex = await rpc<string>("eth_blockNumber", []);
  return parseInt(hex, 16);
}

export async function getGasPriceWei(): Promise<bigint> {
  const hex = await rpc<string>("eth_gasPrice", []);
  return BigInt(hex);
}

export async function getChainId(): Promise<number> {
  const hex = await rpc<string>("eth_chainId", []);
  return parseInt(hex, 16);
}

/** ERC-20 balanceOf via eth_call. */
export async function getErc20Balance(token: string, holder: string): Promise<bigint> {
  const data = "0x70a08231" + holder.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  const hex = await rpc<string>("eth_call", [{ to: token, data }, "latest"]);
  return BigInt(hex);
}

export type ScanTx = {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  gasPrice: string;
  timeStamp: string;
  blockNumber: string;
  isError: string;
  txreceipt_status?: string;
  input: string;
  methodId?: string;
};

export async function scanTxList(address: string, offset = 20): Promise<ScanTx[]> {
  const url = `${SCAN}?module=account&action=txlist&address=${address}&page=1&offset=${offset}&sort=desc`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Arcscan HTTP ${res.status}`);
  const j = (await res.json()) as { message: string; result: ScanTx[] | string };
  if (!Array.isArray(j.result)) return [];
  return j.result;
}

export function fmtUnits(wei: bigint, decimals: number, digits = 4): string {
  const s = wei.toString().padStart(decimals + 1, "0");
  const i = s.slice(0, -decimals) || "0";
  const f = s.slice(-decimals).slice(0, digits);
  return `${i}${digits > 0 ? "." + f : ""}`;
}
