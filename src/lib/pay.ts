/**
 * Real on-chain payment helper. Sends native ARC from the connected wallet
 * to the treasury address. Returns the resulting tx hash.
 *
 * USD price is converted to ARC via USD_TO_ARC_RATE (testnet-friendly).
 */
import { sendNativeTx } from "@/hooks/use-wallet-balance";
import { toast } from "sonner";

export const TREASURY_ADDRESS = "0x000000000000000000000000000000000000dEaD";
// 1 USD = 0.001 ARC on testnet (so $5 = 0.005 ARC) — adjust as needed.
export const USD_TO_ARC_RATE = 0.001;

export async function payUSD(usd: number): Promise<string> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("Connect your wallet first");
  }
  const arc = usd * USD_TO_ARC_RATE;
  toast.message("Confirm the transaction in your wallet…");
  const hash = await sendNativeTx(TREASURY_ADDRESS, arc);
  return hash;
}
