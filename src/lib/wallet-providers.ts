/**
 * EIP-6963 multi-wallet discovery.
 * Supports MetaMask, Trust Wallet, Phantom (EVM), Coinbase Wallet, Rabby, OKX, Brave, etc.
 * Any wallet that follows the EIP-6963 standard announces itself and can be picked.
 */

export type Eip1193Provider = {
  request: (a: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, cb: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, cb: (...args: unknown[]) => void) => void;
};

export type WalletProviderInfo = {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
};

export type DiscoveredWallet = {
  info: WalletProviderInfo;
  provider: Eip1193Provider;
};

const SELECTED_KEY = "arc-nova:selected-wallet-rdns";
const discovered = new Map<string, DiscoveredWallet>();
const listeners = new Set<(w: DiscoveredWallet[]) => void>();

function notify() {
  const list = Array.from(discovered.values());
  listeners.forEach((l) => l(list));
}

if (typeof window !== "undefined") {
  window.addEventListener("eip6963:announceProvider", (evt: Event) => {
    const detail = (evt as CustomEvent<DiscoveredWallet>).detail;
    if (detail?.info?.uuid) {
      discovered.set(detail.info.rdns, detail);
      notify();
    }
  });
  // Request announcements
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

export function requestDiscovery() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

export function listWallets(): DiscoveredWallet[] {
  return Array.from(discovered.values());
}

export function subscribeWallets(cb: (w: DiscoveredWallet[]) => void): () => void {
  listeners.add(cb);
  cb(listWallets());
  return () => { listeners.delete(cb); };
}

/** Fallback list built from window.ethereum when no EIP-6963 wallets announced. */
export function fallbackInjected(): DiscoveredWallet[] {
  if (typeof window === "undefined") return [];
  const eth = (window as unknown as { ethereum?: Eip1193Provider & Record<string, unknown> }).ethereum;
  if (!eth) return [];
  // Some wallets expose a providers[] array (Coinbase, older MetaMask)
  const providers = (eth as unknown as { providers?: Eip1193Provider[] }).providers;
  if (providers && providers.length) {
    return providers.map((p, i) => ({
      info: {
        uuid: `injected-${i}`,
        name: detectName(p),
        icon: "",
        rdns: `injected-${i}`,
      },
      provider: p,
    }));
  }
  return [{
    info: { uuid: "injected", name: detectName(eth), icon: "", rdns: "injected" },
    provider: eth,
  }];
}

function detectName(p: unknown): string {
  const o = p as Record<string, unknown>;
  if (o.isMetaMask) return "MetaMask";
  if (o.isTrust || o.isTrustWallet) return "Trust Wallet";
  if (o.isPhantom) return "Phantom";
  if (o.isCoinbaseWallet) return "Coinbase Wallet";
  if (o.isRabby) return "Rabby";
  if (o.isBraveWallet) return "Brave Wallet";
  if (o.isOkxWallet || o.isOKExWallet) return "OKX Wallet";
  return "Browser Wallet";
}

let selectedProvider: Eip1193Provider | null = null;
let selectedRdns: string | null = null;

export function setSelected(w: DiscoveredWallet) {
  selectedProvider = w.provider;
  selectedRdns = w.info.rdns;
  try { localStorage.setItem(SELECTED_KEY, w.info.rdns); } catch { /* noop */ }
  // Assign to window.ethereum so downstream libs (Circle SwapKit, RPC helpers) pick it up.
  try {
    (window as unknown as { ethereum?: Eip1193Provider }).ethereum = w.provider;
  } catch { /* noop */ }
}

export function getSelectedProvider(): Eip1193Provider | null {
  if (selectedProvider) return selectedProvider;
  if (typeof window === "undefined") return null;
  // Try to restore last choice
  try {
    const saved = localStorage.getItem(SELECTED_KEY);
    if (saved) {
      const all = [...listWallets(), ...fallbackInjected()];
      const match = all.find((w) => w.info.rdns === saved);
      if (match) { setSelected(match); return match.provider; }
    }
  } catch { /* noop */ }
  return (window as unknown as { ethereum?: Eip1193Provider }).ethereum ?? null;
}

export function getSelectedRdns(): string | null { return selectedRdns; }

export function clearSelected() {
  selectedProvider = null;
  selectedRdns = null;
  try { localStorage.removeItem(SELECTED_KEY); } catch { /* noop */ }
}
