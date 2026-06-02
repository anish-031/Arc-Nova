/**
 * Real on-chain payment helper.
 *
 * Flow:
 *  1. Prompt the connected wallet (EIP-1193) to send a native ARC transfer
 *     to TREASURY_ADDRESS for the USD-equivalent amount.
 *  2. Poll `eth_getTransactionReceipt` until the tx is mined and `status=0x1`.
 *  3. Return { hash, valueWei } so callers can pass them to the server-side
 *     verification + record fn.
 */
import { toast } from "sonner";

export const TREASURY_ADDRESS = "0x000000000000000000000000000000000000dEaD";
// 1 USD = 0.001 ARC on testnet (so $5 = 0.005 ARC) — adjust as needed.
export const USD_TO_ARC_RATE = 0.001;

export type PaymentResult = { hash: string; valueWei: string };

function usdToWei(usd: number): bigint {
  // Avoid floating point drift: convert to micro-ARC first.
  const microArc = Math.round(usd * USD_TO_ARC_RATE * 1_000_000);
  return BigInt(microArc) * 10n ** 12n; // 1e18 / 1e6
}

async function getReceipt(hash: string, timeoutMs = 120_000): Promise<{ status: string } | null> {
  if (!window.ethereum) throw new Error("Wallet disconnected");
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const r = (await window.ethereum.request({
      method: "eth_getTransactionReceipt",
      params: [hash],
    })) as { status?: string } | null;
    if (r && r.status) return { status: r.status };
    await new Promise((res) => setTimeout(res, 2500));
  }
  return null;
}

export async function payUSD(usd: number): Promise<PaymentResult> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("Connect your wallet first");
  }
  const accs = (await window.ethereum.request({ method: "eth_accounts" })) as string[];
  const from = accs[0];
  if (!from) throw new Error("Connect your wallet first");

  const valueWei = usdToWei(usd);
  const valueHex = "0x" + valueWei.toString(16);

  toast.message("Confirm the transaction in your wallet…");
  const hash = (await window.ethereum.request({
    method: "eth_sendTransaction",
    params: [{ from, to: TREASURY_ADDRESS, value: valueHex }],
  })) as string;

  toast.message("Waiting for on-chain confirmation…");
  const receipt = await getReceipt(hash);
  if (!receipt) throw new Error("Transaction timed out before confirmation");
  if (receipt.status !== "0x1") throw new Error("Transaction failed on-chain");

  return { hash, valueWei: valueWei.toString() };
}
