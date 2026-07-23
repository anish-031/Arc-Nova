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
import { ARC_TESTNET, isStaleArcNetworkError, STALE_ARC_CHAIN_ID_HEX, STALE_ARC_NETWORK_MESSAGE } from "@/lib/arc";

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
      // Force MetaMask to prompt account selection every time, even after a prior connect.
      try {
        await window.ethereum.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch (permErr: unknown) {
        const c = (permErr as { code?: number })?.code;
        // 4001 = user rejected the permission prompt.
        if (c === 4001) throw permErr;
        // Older wallets may not support wallet_requestPermissions — fall through to eth_requestAccounts.
      }
      const accs = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      const addr = accs[0]?.toLowerCase() ?? null;
      if (!addr) throw new Error("No account selected");
      // Only switch/add Arc when the wallet is not already on the expected chain.
      try {
        const current = ((await window.ethereum.request({ method: "eth_chainId" })) as string).toLowerCase();
        if (current !== ARC_NETWORK.chainId.toLowerCase()) {
          await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: ARC_NETWORK.chainId }] });
        }
      } catch (err: unknown) {
        const e = err as { code?: number };
        if (e?.code === 4902) {
          try {
            await window.ethereum.request({ method: "wallet_addEthereumChain", params: [ARC_NETWORK] });
          } catch (addError) {
            if (isStaleArcNetworkError(addError)) throw new Error(STALE_ARC_NETWORK_MESSAGE);
            throw addError;
          }
          await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: ARC_NETWORK.chainId }] }).catch(() => undefined);
        } else {
          const current = await window.ethereum.request({ method: "eth_chainId" }).catch(() => null);
          if (typeof current === "string" && current.toLowerCase() === STALE_ARC_CHAIN_ID_HEX) throw new Error(STALE_ARC_NETWORK_MESSAGE);
          throw err;
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

  const disconnect = useCallback(() => {
    setAddress(null);
    toast.success("Wallet disconnected");
  }, []);

  return { address, connecting, connect, disconnect };
}
