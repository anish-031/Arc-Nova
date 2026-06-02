import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useWallet, ARC_NETWORK } from "@/hooks/use-wallet";
import { useWalletBalance, sendNativeTx } from "@/hooks/use-wallet-balance";
import { RefreshCw, Copy, QrCode, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, ExternalLink, Wallet as WalletIcon, TrendingUp, TrendingDown, Activity, History } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({ meta: [{ title: "Wallet — ARC NOVA" }] }),
  component: WalletPage,
});

type Tab = "overview" | "tokens" | "history";

function WalletPage() {
  const { address, connect, connecting } = useWallet();
  const { eth, gasGwei, txCount, refresh, loading } = useWalletBalance();
  const [tab, setTab] = useState<Tab>("overview");
  const [sendOpen, setSendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);

  const usd = eth != null ? eth * 1 : null; // 1 ARC ≈ $1 testnet placeholder

  function copy() {
    if (!address) return;
    navigator.clipboard.writeText(address);
    toast.success("Address copied");
  }

  if (!address) {
    return (
      <main className="max-w-7xl mx-auto px-6 py-16 text-center">
        <WalletIcon className="w-12 h-12 text-muted-foreground mx-auto" />
        <h1 className="text-2xl font-bold mt-4">Connect your wallet</h1>
        <p className="text-muted-foreground mt-1">Link a wallet on Arc Network to view balances and transact.</p>
        <button onClick={connect} disabled={connecting}
          className="mt-6 px-5 py-2.5 rounded-lg bg-gradient-to-r from-primary to-accent text-white font-medium disabled:opacity-50">
          {connecting ? "Connecting…" : "Connect Wallet"}
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><WalletIcon className="text-neon" /> Wallet</h1>
          <p className="text-muted-foreground">Manage your assets on Arc Network</p>
        </div>
        <button onClick={refresh} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-800 hover:border-zinc-600 text-sm disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={<WalletIcon className="text-primary" />} label="Total Balance" value={usd != null ? `$${usd.toFixed(2)}` : "—"} />
        <Stat icon={<TrendingUp className="text-success" />} label="Received" value="0" />
        <Stat icon={<TrendingDown className="text-destructive" />} label="Sent" value="0" />
        <Stat icon={<Activity className="text-accent" />} label="Total Tx" value={txCount?.toString() ?? "—"} />
      </div>

      <div className="flex gap-1 border-b border-zinc-800">
        {(["overview", "tokens", "history"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm capitalize border-b-2 transition-colors ${
              tab === t ? "border-primary text-neon" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>{t}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid lg:grid-cols-2 gap-4">
          <section className="panel border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Wallet</h3>
              <button onClick={refresh} className="text-muted-foreground hover:text-foreground"><RefreshCw className="w-4 h-4" /></button>
            </div>
            <div className="mt-4 flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
              <span className="font-mono text-xs truncate flex-1">{address}</span>
              <button onClick={copy} className="text-muted-foreground hover:text-foreground"><Copy className="w-4 h-4" /></button>
              <button onClick={() => setReceiveOpen(true)} className="text-muted-foreground hover:text-foreground"><QrCode className="w-4 h-4" /></button>
            </div>
            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">Total Balance</p>
              <p className="text-4xl font-bold text-neon mt-1">${(usd ?? 0).toFixed(2)}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-6">
              <ActionBtn onClick={() => setSendOpen(true)} icon={<ArrowUpRight />} label="Send" />
              <ActionBtn onClick={() => setReceiveOpen(true)} icon={<ArrowDownLeft />} label="Receive" />
              <ActionBtn onClick={() => toast.info("Swap routing coming soon")} icon={<ArrowLeftRight />} label="Swap" />
            </div>
            <div className="mt-6 space-y-2">
              <TokenRow symbol="ARC" name="Arc Native" amount={eth ?? 0} usd={usd ?? 0} color="bg-blue-500" />
            </div>
            <div className="mt-4 flex justify-center gap-4 text-xs">
              <a href="https://faucet.arc.network" target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">Get Testnet ARC <ExternalLink className="w-3 h-3" /></a>
              <a href={`${ARC_NETWORK.blockExplorerUrls[0]}/address/${address}`} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">View on Explorer <ExternalLink className="w-3 h-3" /></a>
            </div>
          </section>

          <section className="panel border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2"><History className="w-4 h-4" /> Recent Activity</h3>
              <button className="text-xs text-primary hover:underline">View all</button>
            </div>
            <div className="mt-10 text-center text-muted-foreground">
              <History className="w-10 h-10 mx-auto opacity-40" />
              <p className="mt-3 text-sm">No transactions yet</p>
            </div>
          </section>
        </div>
      )}

      {tab === "tokens" && (
        <section className="panel border border-zinc-800 rounded-xl p-6 space-y-2">
          <TokenRow symbol="ARC" name="Arc Native" amount={eth ?? 0} usd={usd ?? 0} color="bg-blue-500" />
          <TokenRow symbol="USDC" name="USD Coin" amount={0} usd={0} color="bg-blue-400" />
          <TokenRow symbol="EURC" name="Euro Coin" amount={0} usd={0} color="bg-blue-600" />
        </section>
      )}

      {tab === "history" && (
        <section className="panel border border-zinc-800 rounded-xl p-6">
          <p className="text-sm text-muted-foreground">Network gas price: <span className="text-neon font-mono">{gasGwei?.toFixed(2) ?? "—"} gwei</span></p>
          <p className="text-sm text-muted-foreground mt-1">Nonce: <span className="text-neon font-mono">{txCount ?? "—"}</span></p>
          <p className="mt-6 text-center text-muted-foreground text-sm">Full transaction history will populate from explorer indexing.</p>
        </section>
      )}

      {sendOpen && <SendDialog onClose={() => { setSendOpen(false); refresh(); }} />}
      {receiveOpen && <ReceiveDialog address={address} onClose={() => setReceiveOpen(false)} />}
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="panel border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-1 py-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-primary hover:text-neon transition-colors text-sm">
      <span className="w-4 h-4">{icon}</span>
      {label}
    </button>
  );
}

function TokenRow({ symbol, name, amount, usd, color }: { symbol: string; name: string; amount: number; usd: number; color: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-900/60 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-full ${color}`} />
        <div>
          <p className="font-semibold">{symbol}</p>
          <p className="text-xs text-muted-foreground">{name}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-mono">{amount.toFixed(4)}</p>
        <p className="text-xs text-muted-foreground">${usd.toFixed(2)}</p>
      </div>
    </div>
  );
}

function SendDialog({ onClose }: { onClose: () => void }) {
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const tx = await sendNativeTx(to.trim(), Number(amount));
      toast.success("Transaction sent: " + tx.slice(0, 10) + "…");
      onClose();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal onClose={onClose} title="Send ARC">
      <form onSubmit={go} className="space-y-4">
        <Field label="To address" value={to} onChange={setTo} placeholder="0x…" required />
        <Field label="Amount (ARC)" value={amount} onChange={setAmount} type="number" step="0.0001" required />
        <button disabled={busy} className="w-full py-2.5 rounded-lg bg-gradient-to-r from-primary to-accent text-white font-medium disabled:opacity-50">
          {busy ? "Sending…" : "Send"}
        </button>
      </form>
    </Modal>
  );
}

function ReceiveDialog({ address, onClose }: { address: string; onClose: () => void }) {
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&bgcolor=09090b&color=ffffff&data=${encodeURIComponent(address)}`;
  return (
    <Modal onClose={onClose} title="Receive">
      <div className="text-center space-y-4">
        <img src={qr} alt="QR" className="mx-auto rounded-lg border border-zinc-800" />
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 font-mono text-xs break-all">{address}</div>
        <button onClick={() => { navigator.clipboard.writeText(address); toast.success("Copied"); }}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Copy address</button>
      </div>
    </Modal>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md panel border border-zinc-800 rounded-xl p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, ...rest }: { label: string; value: string; onChange: (v: string) => void; [k: string]: unknown }) {
  return (
    <div>
      <label className="block text-xs font-display tracking-widest text-muted-foreground mb-1">{label.toUpperCase()}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:border-primary"
        {...(rest as React.InputHTMLAttributes<HTMLInputElement>)} />
    </div>
  );
}
