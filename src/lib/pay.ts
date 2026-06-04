/**
 * Real on-chain payment helper for Arc Testnet.
 *
 * Arc Testnet uses USDC as the native gas token (18 decimals). A native
 * `eth_sendTransaction` therefore moves USDC directly — no ERC-20 call needed.
 *
 * Flow:
 *  1. Ensure the wallet is on Arc Testnet (add/switch chain if needed).
 *  2. Prompt the wallet to send USDC (native value) to TREASURY_ADDRESS.
 *  3. Poll `eth_getTransactionReceipt` until the tx is mined and `status=0x1`.
 *  4. Return { hash, valueWei } for server-side verification.
 */
import { toast } from "sonner";
import { ARC_TESTNET, USDC_DECIMALS } from "./arc";

/**
 * Treasury address that receives buyer payments on Arc Testnet.
 * TODO: replace with a wallet you control before going live.
 */
export const TREASURY_ADDRESS = "0x000000000000000000000000000000000000dEaD";

export type PaymentResult = { hash: string; valueWei: string };

/** Convert USD amount to USDC-wei (18 decimals on Arc). 1 USD = 1 USDC. */
function usdToWei(usd: number): bigint {
  // Use 6-decimal micro-USDC as the integer pivot to avoid float drift.
  const microUsdc = Math.round(usd * 1_000_000);
  return BigInt(microUsdc) * 10n ** BigInt(USDC_DECIMALS - 6);
}

async function ensureArcTestnet(): Promise<void> {
  if (!window.ethereum) throw new Error("Connect your wallet first");
  const expected = ARC_TESTNET.chainIdHex.toLowerCase();

  const readChain = async () =>
    ((await window.ethereum!.request({ method: "eth_chainId" })) as string).toLowerCase();

  let current = await readChain();
  if (current === expected) return;

  const addArc = async () => {
    await window.ethereum!.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: ARC_TESTNET.chainIdHex,
          chainName: ARC_TESTNET.name,
          rpcUrls: [ARC_TESTNET.rpcUrl],
          blockExplorerUrls: [ARC_TESTNET.explorer],
          nativeCurrency: ARC_TESTNET.currency,
        },
      ],
    });
  };

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ARC_TESTNET.chainIdHex }],
    });
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    // 4902 = chain not in wallet. -32603 / generic errors can also mean the
    // wallet's saved chainId for the same RPC doesn't match — try adding fresh.
    if (code === 4902 || code === -32603) {
      await addArc();
    } else {
      throw err;
    }
  }

  current = await readChain();
  if (current !== expected) {
    // Wallet has a stale "Arc Testnet" entry with a different chain ID.
    throw new Error(
      `Wallet is on chain ${current} but Arc Testnet is ${expected} (${ARC_TESTNET.chainId}). ` +
        `Open MetaMask → Settings → Networks → delete the existing "Arc Testnet" entry, then reconnect.`,
    );
  }
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
    // Arc has sub-second finality, so poll fast.
    await new Promise((res) => setTimeout(res, 1000));
  }
  return null;
}

export async function payUSD(usd: number): Promise<PaymentResult> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("Connect your wallet first");
  }
  await ensureArcTestnet();

  const accs = (await window.ethereum.request({ method: "eth_accounts" })) as string[];
  const from = accs[0];
  if (!from) throw new Error("Connect your wallet first");

  const valueWei = usdToWei(usd);
  const valueHex = "0x" + valueWei.toString(16);

  toast.message(`Confirm $${usd} USDC payment in your wallet…`);
  const hash = (await window.ethereum.request({
    method: "eth_sendTransaction",
    params: [{ from, to: TREASURY_ADDRESS, value: valueHex }],
  })) as string;

  toast.message("Waiting for Arc confirmation…");
  const receipt = await getReceipt(hash);
  if (!receipt) throw new Error("Transaction timed out before confirmation");
  if (receipt.status !== "0x1") throw new Error("Transaction failed on-chain");

  return { hash, valueWei: valueWei.toString() };
}
