import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useWallet, ARC_NETWORK } from "@/hooks/use-wallet";
import { useWalletBalance } from "@/hooks/use-wallet-balance";
import { Droplet, Wallet as WalletIcon, Fuel, History, Activity, ExternalLink, Search, RefreshCw, Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tools")({
  head: () => ({ meta: [{ title: "ArcTools — ARC NOVA" }] }),
  component: ToolsPage,
});

type Tool = "faucet" | "tracker" | "gas" | "history" | "status";

const TOOLS: { id: Tool; label: string; Icon: typeof Droplet; color: string }[] = [
  { id: "faucet", label: "Faucet Checker", Icon: Droplet, color: "bg-cyan-600/20 text-cyan-400" },
  { id: "tracker", label: "Wallet Tracker", Icon: WalletIcon, color: "bg-emerald-600/20 text-emerald-400" },
  { id: "gas", label: "Gas Checker", Icon: Fuel, color: "bg-orange-600/20 text-orange-400" },
  { id: "history", label: "Transaction History", Icon: History, color: "bg-purple-600/20 text-purple-400" },
  { id: "status", label: "Network Status", Icon: Activity, color: "bg-blue-600/20 text-blue-400" },
];

function ToolsPage() {
  const [tool, setTool] = useState<Tool>("faucet");
  return (
    <main className="max-w-7xl mx-auto px-6 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">ArcTools</h1>
        <p className="text-muted-foreground">Helpful tools for the Arc Network ecosystem</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {TOOLS.map(({ id, label, Icon, color }) => {
          const active = id === tool;
          return (
            <button key={id} onClick={() => setTool(id)}
              className={`panel border rounded-xl p-4 text-center transition-all ${
                active ? "border-primary glow-border" : "border-zinc-800 hover:border-zinc-600"
              }`}>
              <div className={`w-10 h-10 rounded-lg ${color} mx-auto flex items-center justify-center`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="mt-3 text-sm font-medium">{label}</p>
            </button>
          );
        })}
      </div>

      <div className="panel border border-zinc-800 rounded-xl p-6 min-h-[300px]">
        {tool === "faucet" && <FaucetChecker />}
        {tool === "tracker" && <WalletTracker />}
        {tool === "gas" && <GasChecker />}
        {tool === "history" && <TxHistory />}
        {tool === "status" && <NetworkStatus />}
      </div>
    </main>
  );
}

function FaucetChecker() {
  const { address, connect } = useWallet();
  const { eth, loading, refresh } = useWalletBalance();
  const eligible = eth != null && eth < 0.1;
  return (
    <div>
      <h3 className="text-lg font-bold">Testnet Faucet</h3>
      <p className="text-sm text-muted-foreground">Get free testnet USDC and EURC for testing</p>
      {!address ? (
        <Empty cta="Connect Wallet" onClick={connect} />
      ) : (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Current USDC balance</p>
              <p className="text-2xl font-bold text-neon">{eth?.toFixed(4) ?? "—"} USDC</p>
            </div>
            <button onClick={refresh} disabled={loading} className="text-muted-foreground hover:text-foreground">
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className={`p-4 rounded-lg border ${eligible ? "border-success/40 bg-success/5" : "border-warning/40 bg-warning/5"}`}>
            <p className="font-semibold">{eligible ? "✓ Eligible for faucet drip" : "⚠ Not eligible — balance above 0.1 USDC"}</p>
          </div>
          <a href="https://faucet.circle.com" target="_blank" rel="noreferrer"
            className="block text-center py-2.5 rounded-lg bg-gradient-to-r from-primary to-accent text-white font-medium">
            Open Circle Faucet <ExternalLink className="w-4 h-4 inline ml-1" />
          </a>
        </div>
      )}
    </div>
  );
}

function WalletTracker() {
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<string | null>(null);
  const { eth, txCount, loading, refresh } = useWalletBalance(target ?? undefined);
  function lookup(e: React.FormEvent) {
    e.preventDefault();
    if (/^0x[a-fA-F0-9]{40}$/.test(query.trim())) setTarget(query.trim());
  }
  return (
    <div>
      <h3 className="text-lg font-bold">Wallet Tracker</h3>
      <p className="text-sm text-muted-foreground">Look up any Arc Network address</p>
      <form onSubmit={lookup} className="mt-4 flex gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="0x…"
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 font-mono text-sm focus:outline-none focus:border-primary" />
        <button className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground"><Search className="w-4 h-4" /></button>
      </form>
      {target && (
        <div className="mt-6 space-y-3">
          <Stat label="Balance" value={loading ? "Loading…" : `${eth?.toFixed(4) ?? "—"} USDC`} />
          <Stat label="Total transactions" value={txCount?.toString() ?? "—"} />
          <button onClick={refresh} className="text-xs text-primary hover:underline">Refresh</button>
        </div>
      )}
    </div>
  );
}

function GasChecker() {
  const { gasGwei, refresh, loading } = useWalletBalance();
  return (
    <div>
      <h3 className="text-lg font-bold">Gas Checker</h3>
      <p className="text-sm text-muted-foreground">Live network gas price</p>
      <div className="mt-8 text-center">
        <p className="text-6xl font-bold text-neon">{gasGwei?.toFixed(2) ?? "—"}</p>
        <p className="text-muted-foreground mt-2">gwei</p>
        <button onClick={refresh} disabled={loading} className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-800 hover:border-zinc-600">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>
    </div>
  );
}

function TxHistory() {
  const { address, connect } = useWallet();
  const { txCount } = useWalletBalance();
  return (
    <div>
      <h3 className="text-lg font-bold">Transaction History</h3>
      {!address ? <Empty cta="Connect Wallet" onClick={connect} /> : (
        <div className="mt-6">
          <Stat label="Outbound transactions (nonce)" value={txCount?.toString() ?? "—"} />
          <a href={`${ARC_NETWORK.blockExplorerUrls[0]}/address/${address}`} target="_blank" rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground">
            Open in Explorer <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}
    </div>
  );
}

function NetworkStatus() {
  const { chainId, gasGwei, refresh, loading } = useWalletBalance();
  const ok = chainId === ARC_NETWORK.chainId;
  return (
    <div>
      <h3 className="text-lg font-bold">Network Status</h3>
      <div className="mt-6 space-y-3">
        <div className={`p-4 rounded-lg border ${ok ? "border-success/40 bg-success/5" : "border-warning/40 bg-warning/5"}`}>
          <p className="font-semibold">{ok ? "✓ Connected to Arc Network" : "⚠ Not on Arc Network"}</p>
          <p className="text-xs text-muted-foreground mt-1">Current chainId: <span className="font-mono">{chainId ?? "—"}</span></p>
        </div>
        <Stat label="Gas price" value={`${gasGwei?.toFixed(2) ?? "—"} gwei`} />
        <Stat label="RPC" value={ARC_NETWORK.rpcUrls[0]} mono />
        <button onClick={refresh} disabled={loading} className="text-sm text-primary hover:underline">Refresh</button>
      </div>
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs text-neon" : "font-semibold text-neon"}>{value}</span>
    </div>
  );
}

function Empty({ cta, onClick }: { cta: string; onClick: () => void }) {
  return (
    <div className="mt-10 text-center">
      <Wallet className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
      <p className="mt-3 text-sm text-muted-foreground">Connect your wallet to check eligibility</p>
      <button onClick={onClick} className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">{cta}</button>
    </div>
  );
}
