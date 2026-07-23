import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useWallet, ARC_NETWORK } from "@/hooks/use-wallet";
import { ARC_TESTNET, ARC_TOKENS, USDC_DECIMALS } from "@/lib/arc";
import {
  getBalanceWei, getTxCount, getBlockNumber, getGasPriceWei,
  getChainId, getErc20Balance, scanTxList, fmtUnits, type ScanTx,
} from "@/lib/arc-rpc";
import {
  Droplet, Wallet as WalletIcon, Fuel, History, Activity,
  ExternalLink, Search, RefreshCw, Wallet, CheckCircle2, XCircle, Copy, Clock,
} from "lucide-react";
import { toast } from "sonner";

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

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;

function ToolsPage() {
  const [tool, setTool] = useState<Tool>("faucet");
  return (
    <main className="max-w-7xl mx-auto px-6 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">ArcTools</h1>
        <p className="text-muted-foreground">Live utilities powered by Arc Testnet RPC & Arcscan</p>
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

/* -------------------------------- Faucet -------------------------------- */
function FaucetChecker() {
  const { address, connect } = useWallet();
  const [usdcNative, setUsdcNative] = useState<bigint | null>(null);
  const [eurc, setEurc] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const [n, e] = await Promise.all([
        getBalanceWei(address),
        ARC_TOKENS.EURC.address ? getErc20Balance(ARC_TOKENS.EURC.address, address) : Promise.resolve(0n),
      ]);
      setUsdcNative(n);
      setEurc(e);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { refresh(); }, [refresh]);

  const usdcNum = usdcNative == null ? null : Number(usdcNative) / 10 ** USDC_DECIMALS;
  const eurcNum = eurc == null ? null : Number(eurc) / 10 ** ARC_TOKENS.EURC.decimals;
  const eligible = usdcNum != null && usdcNum < 0.1;

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold">Testnet Faucet</h3>
          <p className="text-sm text-muted-foreground">Check your balance and drip testnet USDC / EURC</p>
        </div>
        {address && (
          <button onClick={refresh} disabled={loading} className="text-muted-foreground hover:text-foreground">
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>
      {!address ? (
        <Empty cta="Connect Wallet" onClick={connect} />
      ) : (
        <div className="mt-6 space-y-3">
          <BalanceRow label="USDC (native gas)" value={usdcNum} symbol="USDC" />
          <BalanceRow label="EURC (ERC-20)" value={eurcNum} symbol="EURC" />
          <div className={`p-4 rounded-lg border ${eligible ? "border-success/40 bg-success/5" : "border-warning/40 bg-warning/5"}`}>
            <p className="font-semibold flex items-center gap-2">
              {eligible ? <CheckCircle2 className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-warning" />}
              {eligible ? "Eligible for faucet drip" : "Not eligible — balance above 0.1 USDC"}
            </p>
          </div>
          <a href={ARC_TESTNET.faucet} target="_blank" rel="noreferrer"
            className="block text-center py-2.5 rounded-lg bg-gradient-to-r from-primary to-accent text-white font-medium">
            Open Circle Faucet <ExternalLink className="w-4 h-4 inline ml-1" />
          </a>
        </div>
      )}
    </div>
  );
}

function BalanceRow({ label, value, symbol }: { label: string; value: number | null; symbol: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold text-neon">{value?.toFixed(4) ?? "—"} {symbol}</p>
    </div>
  );
}

/* ------------------------------- Tracker ------------------------------- */
function WalletTracker() {
  const { address: own } = useWallet();
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<string | null>(null);
  const [data, setData] = useState<{ usdc: bigint; eurc: bigint; nonce: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async (addr: string) => {
    setLoading(true); setErr(null);
    try {
      const [usdc, eurc, nonce] = await Promise.all([
        getBalanceWei(addr),
        ARC_TOKENS.EURC.address ? getErc20Balance(ARC_TOKENS.EURC.address, addr) : Promise.resolve(0n),
        getTxCount(addr),
      ]);
      setData({ usdc, eurc, nonce });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (target) load(target); }, [target, load]);

  function lookup(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!ADDR_RE.test(q)) { toast.error("Invalid EVM address"); return; }
    setTarget(q);
  }

  function useMine() {
    if (!own) { toast.error("Connect your wallet first"); return; }
    setQuery(own); setTarget(own);
  }

  return (
    <div>
      <h3 className="text-lg font-bold">Wallet Tracker</h3>
      <p className="text-sm text-muted-foreground">Look up any Arc Testnet address</p>
      <form onSubmit={lookup} className="mt-4 flex gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="0x…"
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 font-mono text-sm focus:outline-none focus:border-primary" />
        <button type="submit" className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground"><Search className="w-4 h-4" /></button>
        <button type="button" onClick={useMine} className="px-3 py-2.5 rounded-lg border border-zinc-800 text-xs">Use mine</button>
      </form>

      {err && <p className="mt-4 text-sm text-destructive">{err}</p>}

      {target && (
        <div className="mt-6 space-y-3">
          <Stat label="Address" value={short(target)} mono />
          <Stat label="USDC balance" value={loading ? "…" : `${data ? fmtUnits(data.usdc, USDC_DECIMALS) : "—"} USDC`} />
          <Stat label="EURC balance" value={loading ? "…" : `${data ? fmtUnits(data.eurc, ARC_TOKENS.EURC.decimals) : "—"} EURC`} />
          <Stat label="Outbound tx count" value={loading ? "…" : (data?.nonce.toString() ?? "—")} />
          <div className="flex gap-2 pt-2">
            <button onClick={() => target && load(target)} disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-800 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <a href={`${ARC_TESTNET.explorer}/address/${target}`} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs">
              Open in Explorer <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Gas --------------------------------- */
function GasChecker() {
  const [gasWei, setGasWei] = useState<bigint | null>(null);
  const [block, setBlock] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [g, b] = await Promise.all([getGasPriceWei(), getBlockNumber()]);
      setGasWei(g); setBlock(b);
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); const t = setInterval(refresh, 12000); return () => clearInterval(t); }, [refresh]);

  const gwei = gasWei == null ? null : Number(gasWei) / 1e9;
  // Standard EVM transfer = 21000 gas
  const transferCostUsdc = gasWei == null ? null : Number(gasWei * 21000n) / 10 ** USDC_DECIMALS;
  // ERC-20 transfer ≈ 65000 gas
  const erc20CostUsdc = gasWei == null ? null : Number(gasWei * 65000n) / 10 ** USDC_DECIMALS;

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold">Gas Checker</h3>
          <p className="text-sm text-muted-foreground">Live gas price on Arc Testnet · auto-refresh 12s</p>
        </div>
        <button onClick={refresh} disabled={loading} className="text-muted-foreground hover:text-foreground">
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="mt-6 text-center">
        <p className="text-6xl font-bold text-neon">{gwei?.toFixed(2) ?? "—"}</p>
        <p className="text-muted-foreground mt-1">gwei</p>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Stat label="Native transfer (21k gas)" value={transferCostUsdc == null ? "—" : `${transferCostUsdc.toFixed(6)} USDC`} />
        <Stat label="ERC-20 transfer (~65k gas)" value={erc20CostUsdc == null ? "—" : `${erc20CostUsdc.toFixed(6)} USDC`} />
        <Stat label="Latest block" value={block?.toLocaleString() ?? "—"} />
        <Stat label="Chain" value={`${ARC_TESTNET.name} (${ARC_TESTNET.chainId})`} />
      </div>
    </div>
  );
}

/* ------------------------------- History ------------------------------- */
function TxHistory() {
  const { address: own, connect } = useWallet();
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<string | null>(null);
  const [txs, setTxs] = useState<ScanTx[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { if (own && !target) { setQuery(own); setTarget(own); } }, [own, target]);

  const load = useCallback(async (addr: string) => {
    setLoading(true); setErr(null);
    try {
      const rows = await scanTxList(addr, 25);
      setTxs(rows);
    } catch (e) { setErr((e as Error).message); setTxs([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (target) load(target); }, [target, load]);

  function lookup(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!ADDR_RE.test(q)) { toast.error("Invalid EVM address"); return; }
    setTarget(q);
  }

  return (
    <div>
      <h3 className="text-lg font-bold">Transaction History</h3>
      <p className="text-sm text-muted-foreground">Last 25 transactions on Arcscan</p>

      <form onSubmit={lookup} className="mt-4 flex gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="0x…"
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 font-mono text-sm focus:outline-none focus:border-primary" />
        <button type="submit" className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground"><Search className="w-4 h-4" /></button>
        <button type="button" onClick={() => target && load(target)} disabled={!target || loading}
          className="px-3 py-2.5 rounded-lg border border-zinc-800">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </form>

      {!own && !target && <Empty cta="Connect Wallet" onClick={connect} />}
      {err && <p className="mt-4 text-sm text-destructive">{err}</p>}

      {target && txs && (
        <div className="mt-6">
          {txs.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No transactions found for this address.</p>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {txs.map((tx) => <TxRow key={tx.hash} tx={tx} viewer={target} />)}
            </div>
          )}
          <a href={`${ARC_TESTNET.explorer}/address/${target}`} target="_blank" rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-xs text-primary hover:underline">
            View all on Arcscan <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}

function TxRow({ tx, viewer }: { tx: ScanTx; viewer: string }) {
  const outgoing = tx.from.toLowerCase() === viewer.toLowerCase();
  const failed = tx.isError === "1" || tx.txreceipt_status === "0";
  const value = Number(BigInt(tx.value)) / 10 ** USDC_DECIMALS;
  const ts = Number(tx.timeStamp) * 1000;
  const ago = timeAgo(ts);
  return (
    <a href={`${ARC_TESTNET.explorer}/tx/${tx.hash}`} target="_blank" rel="noreferrer"
      className="flex items-center justify-between p-3 bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800 rounded-lg transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${failed ? "bg-destructive" : outgoing ? "bg-orange-500" : "bg-emerald-500"}`} />
        <div className="min-w-0">
          <p className="text-xs font-mono truncate">{short(tx.hash)}</p>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" /> {ago} · {outgoing ? "OUT" : "IN"} · {short(outgoing ? tx.to : tx.from)}
          </p>
        </div>
      </div>
      <div className="text-right flex-shrink-0 ml-3">
        <p className={`text-sm font-semibold ${outgoing ? "text-orange-400" : "text-emerald-400"}`}>
          {outgoing ? "-" : "+"}{value.toFixed(4)} USDC
        </p>
        {failed && <p className="text-[10px] text-destructive">failed</p>}
      </div>
    </a>
  );
}

/* -------------------------------- Status -------------------------------- */
function NetworkStatus() {
  const [state, setState] = useState<{
    reachable: boolean; chainId: number | null; block: number | null; gasWei: bigint | null; latencyMs: number | null;
  }>({ reachable: false, chainId: null, block: null, gasWei: null, latencyMs: null });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const start = performance.now();
    try {
      const [cid, blk, gas] = await Promise.all([getChainId(), getBlockNumber(), getGasPriceWei()]);
      setState({ reachable: true, chainId: cid, block: blk, gasWei: gas, latencyMs: Math.round(performance.now() - start) });
    } catch {
      setState({ reachable: false, chainId: null, block: null, gasWei: null, latencyMs: Math.round(performance.now() - start) });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); const t = setInterval(refresh, 15000); return () => clearInterval(t); }, [refresh]);

  const rightChain = state.chainId === ARC_TESTNET.chainId;
  const ok = state.reachable && rightChain;
  const gwei = state.gasWei == null ? null : Number(state.gasWei) / 1e9;

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold">Network Status</h3>
          <p className="text-sm text-muted-foreground">Live RPC health · auto-refresh 15s</p>
        </div>
        <button onClick={refresh} disabled={loading} className="text-muted-foreground hover:text-foreground">
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="mt-6 space-y-3">
        <div className={`p-4 rounded-lg border ${ok ? "border-success/40 bg-success/5" : "border-warning/40 bg-warning/5"}`}>
          <p className="font-semibold flex items-center gap-2">
            {ok ? <CheckCircle2 className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-warning" />}
            {ok ? "Arc Testnet operational" : state.reachable ? `Wrong chain (${state.chainId})` : "RPC unreachable"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Latency: {state.latencyMs ?? "—"} ms</p>
        </div>
        <Stat label="Chain" value={`${ARC_TESTNET.name} (${state.chainId ?? "—"})`} />
        <Stat label="Latest block" value={state.block?.toLocaleString() ?? "—"} />
        <Stat label="Gas price" value={gwei == null ? "—" : `${gwei.toFixed(2)} gwei`} />
        <Stat label="RPC endpoint" value={ARC_NETWORK.rpcUrls[0]} mono />
      </div>
    </div>
  );
}

/* -------------------------------- Shared -------------------------------- */
function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg gap-3">
      <span className="text-sm text-muted-foreground flex-shrink-0">{label}</span>
      <span className={`truncate ${mono ? "font-mono text-xs text-neon" : "font-semibold text-neon"}`}>{value}</span>
    </div>
  );
}

function Empty({ cta, onClick }: { cta: string; onClick: () => void }) {
  return (
    <div className="mt-10 text-center">
      <Wallet className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
      <p className="mt-3 text-sm text-muted-foreground">Connect your wallet to continue</p>
      <button onClick={onClick} className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">{cta}</button>
    </div>
  );
}

function short(v: string) { return v.length > 12 ? `${v.slice(0, 6)}…${v.slice(-4)}` : v; }
function timeAgo(ms: number) {
  const s = Math.max(1, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); return `${d}d ago`;
}
