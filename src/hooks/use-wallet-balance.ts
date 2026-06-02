import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/hooks/use-wallet";

/** Read ETH balance via EIP-1193 connected provider. */
export function useWalletBalance(addressOverride?: string) {
  const { address: ownAddress } = useWallet();
  const target = addressOverride ?? ownAddress;
  const [wei, setWei] = useState<bigint | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [gasPriceWei, setGasPriceWei] = useState<bigint | null>(null);
  const [txCount, setTxCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!target || typeof window === "undefined" || !window.ethereum) return;
    setLoading(true);
    try {
      const [bal, cid, gas, nonce] = await Promise.all([
        window.ethereum.request({ method: "eth_getBalance", params: [target, "latest"] }) as Promise<string>,
        window.ethereum.request({ method: "eth_chainId" }) as Promise<string>,
        window.ethereum.request({ method: "eth_gasPrice" }) as Promise<string>,
        window.ethereum.request({ method: "eth_getTransactionCount", params: [target, "latest"] }) as Promise<string>,
      ]);
      setWei(BigInt(bal));
      setChainId(cid);
      setGasPriceWei(BigInt(gas));
      setTxCount(parseInt(nonce, 16));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [target]);

  useEffect(() => { refresh(); }, [refresh]);

  const eth = wei == null ? null : Number(wei) / 1e18;
  const gasGwei = gasPriceWei == null ? null : Number(gasPriceWei) / 1e9;

  return { address: target, eth, wei, chainId, gasGwei, txCount, loading, refresh };
}

export async function sendNativeTx(to: string, ethAmount: number): Promise<string> {
  if (!window.ethereum) throw new Error("No wallet");
  const from = ((await window.ethereum.request({ method: "eth_accounts" })) as string[])[0];
  if (!from) throw new Error("Connect your wallet first");
  const valueWei = BigInt(Math.floor(ethAmount * 1e18));
  const hex = "0x" + valueWei.toString(16);
  const tx = (await window.ethereum.request({
    method: "eth_sendTransaction",
    params: [{ from, to, value: hex }],
  })) as string;
  return tx;
}
