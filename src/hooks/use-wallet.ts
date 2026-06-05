/**
 * Arc Testnet wallet connect (EIP-1193 / window.ethereum).
 * Network parameters per https://docs.arc.io/arc/references/connect-to-arc
 *  - Chain ID:  5042002 (0x4cef52)
 *  - Currency:  USDC (native gas token, 18 decimals)
 *  - RPC:       https://rpc.testnet.arc.network
 *  - Explorer:  https://testnet.arcscan.app
 */
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ARC_TESTNET } from "@/lib/arc";

export const ARC_NETWORK = {
  chainId: ARC_TESTNET.chainIdHex,
  chainName: ARC_TESTNET.name,
  nativeCurrency: ARC_TESTNET.currency,
  rpcUrls: [ARC_TESTNET.rpcUrl],
  blockExplorerUrls: [ARC_TESTNET.explorer],
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
      // Only switch/add Arc when the wallet is not already on the expected chain.
      try {
        const current = ((await window.ethereum.request({ method: "eth_chainId" })) as string).toLowerCase();
        if (current !== ARC_NETWORK.chainId.toLowerCase()) {
          await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: ARC_NETWORK.chainId }] });
        }
      } catch (err: unknown) {
        const e = err as { code?: number };
        if (e?.code === 4902) {
          await window.ethereum.request({ method: "wallet_addEthereumChain", params: [ARC_NETWORK] });
          await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: ARC_NETWORK.chainId }] }).catch(() => undefined);
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
