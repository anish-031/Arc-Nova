/**
 * Arc Network wallet connect (EIP-1193 / window.ethereum).
 * Used to attach `address` to the user profile.
 *
 * Arc Network parameters (per Circle's Arc L1, mainnet placeholder values
 * — replace if the user has different RPC/chainId):
 */
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export const ARC_NETWORK = {
  chainId: "0x504", // 1284 placeholder — set to real Arc chainId when available
  chainName: "Arc Network",
  nativeCurrency: { name: "ARC", symbol: "ARC", decimals: 18 },
  rpcUrls: ["https://rpc.arc.network"],
  blockExplorerUrls: ["https://explorer.arc.network"],
};

type Eth = {
  request: (a: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, cb: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, cb: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window { ethereum?: Eth }
}

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;
    window.ethereum.request({ method: "eth_accounts" }).then((accs) => {
      const a = (accs as string[])[0];
      if (a) setAddress(a.toLowerCase());
    }).catch(() => {});
    const handler = (accs: unknown) => {
      const a = (accs as string[])[0];
      setAddress(a ? a.toLowerCase() : null);
    };
    window.ethereum.on?.("accountsChanged", handler);
    return () => window.ethereum?.removeListener?.("accountsChanged", handler);
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      toast.error("No wallet detected. Install MetaMask to continue.");
      return null;
    }
    setConnecting(true);
    try {
      const accs = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      const addr = accs[0]?.toLowerCase() ?? null;
      // Try switch to Arc Network
      try {
        await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: ARC_NETWORK.chainId }] });
      } catch (err: unknown) {
        const e = err as { code?: number };
        if (e?.code === 4902) {
          await window.ethereum.request({ method: "wallet_addEthereumChain", params: [ARC_NETWORK] });
        }
      }
      setAddress(addr);
      toast.success("Wallet linked to Arc Network");
      return addr;
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message ?? "Failed to connect wallet");
      return null;
    } finally {
      setConnecting(false);
    }
  }, []);

  return { address, connecting, connect };
}
