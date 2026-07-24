import { useEffect, useState } from "react";
import { X, Wallet as WalletIcon } from "lucide-react";
import {
  type DiscoveredWallet,
  subscribeWallets,
  fallbackInjected,
  requestDiscovery,
} from "@/lib/wallet-providers";

const KNOWN = [
  { name: "MetaMask", url: "https://metamask.io/download/" },
  { name: "Trust Wallet", url: "https://trustwallet.com/download" },
  { name: "Phantom", url: "https://phantom.app/download" },
  { name: "Coinbase Wallet", url: "https://www.coinbase.com/wallet/downloads" },
  { name: "Rabby", url: "https://rabby.io/" },
  { name: "OKX Wallet", url: "https://www.okx.com/web3" },
];

export function WalletPicker({
  open, onClose, onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (w: DiscoveredWallet) => void;
}) {
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([]);

  useEffect(() => {
    if (!open) return;
    requestDiscovery();
    const unsub = subscribeWallets((list) => {
      // Merge EIP-6963 with any legacy window.ethereum providers.
      const seen = new Set(list.map((w) => w.info.rdns));
      const merged = [...list, ...fallbackInjected().filter((w) => !seen.has(w.info.rdns))];
      setWallets(merged);
    });
    return unsub;
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h3 className="font-display tracking-widest text-neon text-sm">CONNECT A WALLET</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3 space-y-1 max-h-[60vh] overflow-y-auto">
          {wallets.length === 0 && (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              No wallets detected. Install one of the wallets below and refresh.
            </p>
          )}
          {wallets.map((w) => (
            <button key={w.info.uuid}
              onClick={() => { onPick(w); onClose(); }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-zinc-900 transition-colors text-left">
              {w.info.icon ? (
                <img src={w.info.icon} alt={w.info.name} className="w-8 h-8 rounded-lg" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                  <WalletIcon className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              <span className="text-sm font-medium">{w.info.name}</span>
            </button>
          ))}
          <div className="mt-3 border-t border-zinc-800 pt-3">
            <p className="px-3 pb-2 text-[10px] font-display tracking-widest text-muted-foreground">DON'T HAVE ONE?</p>
            <div className="grid grid-cols-2 gap-1">
              {KNOWN.map((k) => (
                <a key={k.name} href={k.url} target="_blank" rel="noreferrer"
                  className="px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-neon hover:bg-zinc-900 transition-colors">
                  {k.name} ↗
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
