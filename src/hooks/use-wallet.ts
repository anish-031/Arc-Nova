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
import {
  type DiscoveredWallet,
  type Eip1193Provider,
  getSelectedProvider,
  setSelected,
  clearSelected,
} from "@/lib/wallet-providers";

export const ARC_NETWORK = {
  chainId: ARC_TESTNET.chainIdHex,
  chainName: ARC_TESTNET.name,
  nativeCurrency: ARC_TESTNET.currency,
  rpcUrls: [ARC_TESTNET.rpcUrl],
  blockExplorerUrls: [ARC_TESTNET.explorer],
};

declare global {
  interface Window { ethereum?: Eip1193Provider }
}

function activeProvider(): Eip1193Provider | null {
  return getSelectedProvider() ?? (typeof window !== "undefined" ? window.ethereum ?? null : null);
}

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const eth = activeProvider();
    if (!eth) return;
    eth.request({ method: "eth_accounts" }).then((accs) => {
      const a = (accs as string[])[0];
      if (a) setAddress(a.toLowerCase());
    }).catch(() => {});
    const handler = (accs: unknown) => {
      const a = (accs as string[])[0];
      setAddress(a ? a.toLowerCase() : null);
    };
    eth.on?.("accountsChanged", handler);
    return () => eth.removeListener?.("accountsChanged", handler);
  }, []);

  const connect = useCallback(async (chosen?: DiscoveredWallet) => {
    if (chosen) setSelected(chosen);
    const eth = activeProvider();
    if (!eth) {
      toast.error("No wallet detected. Install MetaMask, Trust Wallet, Phantom or another EVM wallet.");
      return null;
    }
    setConnecting(true);
    try {
      try {
        await eth.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] });
      } catch (permErr: unknown) {
        const c = (permErr as { code?: number })?.code;
        if (c === 4001) throw permErr;
      }
      const accs = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      const addr = accs[0]?.toLowerCase() ?? null;
      if (!addr) throw new Error("No account selected");
      try {
        const current = ((await eth.request({ method: "eth_chainId" })) as string).toLowerCase();
        if (current !== ARC_NETWORK.chainId.toLowerCase()) {
          await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: ARC_NETWORK.chainId }] });
        }
      } catch (err: unknown) {
        const e = err as { code?: number };
        if (e?.code === 4902) {
          try {
            await eth.request({ method: "wallet_addEthereumChain", params: [ARC_NETWORK] });
          } catch (addError) {
            if (isStaleArcNetworkError(addError)) throw new Error(STALE_ARC_NETWORK_MESSAGE);
            throw addError;
          }
          await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: ARC_NETWORK.chainId }] }).catch(() => undefined);
        } else {
          const current = await eth.request({ method: "eth_chainId" }).catch(() => null);
          if (typeof current === "string" && current.toLowerCase() === STALE_ARC_CHAIN_ID_HEX) throw new Error(STALE_ARC_NETWORK_MESSAGE);
          throw err;
        }
      }
      const message = `ARC NOVA — Sign in to verify wallet ownership.\n\nAddress: ${addr}\nNonce: ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      try {
        await eth.request({ method: "personal_sign", params: [message, addr] });
      } catch (sigErr: unknown) {
        const c = (sigErr as { code?: number })?.code;
        if (c === 4001) throw new Error("Signature declined — wallet not linked");
        throw sigErr;
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

  const disconnect = useCallback(async () => {
    setAddress(null);
    try {
      await activeProvider()?.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] });
    } catch {
      // Older wallets don't support wallet_revokePermissions — safe to ignore.
    }
    clearSelected();
    toast.success("Wallet disconnected");
  }, []);

  return { address, connecting, connect, disconnect };
}

