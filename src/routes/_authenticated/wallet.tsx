import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useWallet, ARC_NETWORK } from "@/hooks/use-wallet";
import { useWalletBalance, sendNativeTx } from "@/hooks/use-wallet-balance";
import { RefreshCw, Copy, QrCode, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, ExternalLink, Wallet as WalletIcon, TrendingUp, TrendingDown, Activity, History } from "lucide-react";
import { toast } from "sonner";
import { TOKENS, getQuote, executeSwap, getGasPriceGwei, waitForReceipt, type Token, type Quote, type SwapStep } from "@/lib/uniswap";
import { useServerFn } from "@tanstack/react-start";
import { createSwapAttempt, updateSwapAttempt, listSwapAttempts } from "@/lib/swaps.functions";
import { scanTxList, fmtUnits, getErc20Balance, type ScanTx } from "@/lib/arc-rpc";
import { ARC_TOKENS } from "@/lib/arc";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({ meta: [{ title: "Wallet — ARC NOVA" }] }),
  component: WalletPage,
});

type Tab = "overview" | "tokens" | "history";

function WalletPage() {
  const { address, connect, connecting, disconnect } = useWallet();
  const { eth, gasGwei, txCount, refresh, loading } = useWalletBalance();
  const [tab, setTab] = useState<Tab>("overview");
  const [sendOpen, setSendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [erc20, setErc20] = useState<{ USDC: number; EURC: number; cBTC: number }>({ USDC: 0, EURC: 0, cBTC: 0 });

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        (Object.entries(ARC_TOKENS) as [keyof typeof ARC_TOKENS, typeof ARC_TOKENS[keyof typeof ARC_TOKENS]][]).map(async ([sym, t]) => {
          if (!t.address) return [sym, 0] as const;
          try {
            const wei = await getErc20Balance(t.address, address);
            return [sym, Number(wei) / 10 ** t.decimals] as const;
          } catch {
            return [sym, 0] as const;
          }
        })
      );
      if (cancelled) return;
      const next = { USDC: 0, EURC: 0, cBTC: 0 };
      for (const [sym, val] of entries) next[sym] = val;
      setErc20(next);
    })();
    return () => { cancelled = true; };
  }, [address, loading]);

  // Native gas token on Arc is USDC (18 decimals) — treat it as the spendable USDC balance.
  const usdcBal = eth ?? 0;
  const eurcBal = erc20.EURC;
  const btcBal = erc20.cBTC;
  const usd = usdcBal + eurcBal; // testnet placeholder: 1 USDC ≈ 1 EURC ≈ $1

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
        <div className="flex items-center gap-2">
          <button onClick={refresh} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-800 hover:border-zinc-600 text-sm disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button onClick={disconnect}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-800 hover:border-destructive hover:text-destructive text-sm">
            Disconnect
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={<WalletIcon className="text-primary" />} label="Total Balance" value={`$${usd.toFixed(2)}`} />
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
              <p className="text-4xl font-bold text-neon mt-1">${usd.toFixed(2)}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-6">
              <ActionBtn onClick={() => setSendOpen(true)} icon={<ArrowUpRight />} label="Send" />
              <ActionBtn onClick={() => setReceiveOpen(true)} icon={<ArrowDownLeft />} label="Receive" />
              <ActionBtn onClick={() => setSwapOpen(true)} icon={<ArrowLeftRight />} label="Swap" />
            </div>
            <div className="mt-6 space-y-2">
              <TokenRow symbol="USDC" name="USD Coin (native gas)" amount={usdcBal} usd={usdcBal} color="bg-blue-500" />
              <TokenRow symbol="EURC" name="Euro Coin" amount={eurcBal} usd={eurcBal} color="bg-indigo-500" />
              <TokenRow symbol="cBTC" name={ARC_TOKENS.cBTC.address ? "Circle Bitcoin" : "Circle Bitcoin (coming soon)"} amount={btcBal} usd={0} color="bg-orange-500" />
            </div>
            <div className="mt-4 flex justify-center gap-4 text-xs">
              <a href="https://faucet.circle.com" target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">Get Testnet USDC <ExternalLink className="w-3 h-3" /></a>
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
          <TokenRow symbol="USDC" name="USD Coin (native)" amount={usdcBal} usd={usdcBal} color="bg-blue-500" />
          <TokenRow symbol="EURC" name="Euro Coin" amount={eurcBal} usd={eurcBal} color="bg-indigo-500" />
          <TokenRow symbol="cBTC" name={ARC_TOKENS.cBTC.address ? "Circle Bitcoin" : "Circle Bitcoin (coming soon)"} amount={btcBal} usd={0} color="bg-orange-500" />
        </section>
      )}

      {tab === "history" && <><OnchainHistory address={address} /><SwapHistory /></>}

      {sendOpen && <SendDialog onClose={() => { setSendOpen(false); refresh(); }} />}
      {receiveOpen && <ReceiveDialog address={address} onClose={() => setReceiveOpen(false)} />}
      {swapOpen && <SwapDialog walletAddress={address} onClose={() => setSwapOpen(false)} />}
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
    <Modal onClose={onClose} title="Send USDC">
      <form onSubmit={go} className="space-y-4">
        <Field label="To address" value={to} onChange={setTo} placeholder="0x…" required />
        <Field label="Amount (USDC)" value={amount} onChange={setAmount} type="number" step="0.0001" required />
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

function SwapDialog({ walletAddress, onClose }: { walletAddress: string | null; onClose: () => void }) {
  const [tokenIn, setTokenIn] = useState<Token>(TOKENS[0]);
  const [tokenOut, setTokenOut] = useState<Token>(TOKENS[1]);
  const [amount, setAmount] = useState("1");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteAt, setQuoteAt] = useState<number | null>(null);
  const [gasGwei, setGasGwei] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [swapping, setSwapping] = useState(false);
  const [step, setStep] = useState<SwapStep | null>(null);
  const [stepErr, setStepErr] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const createAttempt = useServerFn(createSwapAttempt);
  const updateAttempt = useServerFn(updateSwapAttempt);

  async function fetchQuote(silent = false) {
    const a = Number(amount);
    if (!a || a <= 0 || tokenIn.symbol === tokenOut.symbol) {
      setQuote(null);
      return null;
    }
    if (!silent) setLoading(true);
    setErr(null);
    try {
      const [q, g] = await Promise.all([
        getQuote(tokenIn, tokenOut, amount),
        getGasPriceGwei(),
      ]);
      setQuote(q);
      setGasGwei(g);
      setQuoteAt(Date.now());
      return q;
    } catch (e) {
      setErr((e as Error).message);
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }

  // Debounced quote on input change
  useEffect(() => {
    setQuote(null);
    setErr(null);
    const t = setTimeout(() => { void fetchQuote(false); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenIn, tokenOut, amount]);

  // Auto-refresh live quote every 12s while the dialog is idle
  useEffect(() => {
    if (swapping) return;
    const id = setInterval(() => { void fetchQuote(true); }, 12_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenIn, tokenOut, amount, swapping]);

  function flip() {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
  }

  async function execute() {
    setSwapping(true);
    setStep("quoting");
    setStepErr(null);
    setTxHash(null);
    let attemptId: string | null = null;
    try {
      // Auto-refresh quote + gas right before submit so calldata is current
      const fresh = await fetchQuote(true);
      if (!fresh) throw new Error(err ?? "Quote unavailable — try again");

      attemptId = (await createAttempt({
        data: {
          wallet_address: walletAddress,
          token_in: tokenIn.symbol,
          token_out: tokenOut.symbol,
          amount_in: Number(fresh.amountIn),
          amount_out: Number(fresh.amountOut) || null,
          min_received: Number(fresh.stopLimit) || null,
          rate: fresh.rate || null,
          gas_gwei: gasGwei ?? null,
        },
      })).id;

      const res = await executeSwap(tokenIn, tokenOut, fresh.amountIn, (s) => setStep(s));

      setTxHash(res.txHash);
      setStep("confirming");
      await updateAttempt({
        data: {
          id: attemptId,
          status: "broadcast",
          tx_hash: res.txHash,
          explorer_url: res.explorerUrl ?? null,
          amount_out: res.amountOut ? Number(res.amountOut) : null,
        },
      });

      const status = await waitForReceipt(res.txHash);
      if (status === "success") {
        setStep("confirmed");
        await updateAttempt({ data: { id: attemptId, status: "success" } });
        toast.success("Swap confirmed on Arc Testnet");
      } else if (status === "failed") {
        setStep("failed");
        setStepErr("Transaction reverted on-chain");
        await updateAttempt({ data: { id: attemptId, status: "failed", error: "reverted" } });
        toast.error("Swap failed on-chain");
      } else {
        setStepErr("Timed out waiting for confirmation — check Arcscan");
      }
    } catch (e: unknown) {
      const msg = (e as Error).message ?? "Swap failed";
      setStep("failed");
      setStepErr(msg);
      if (attemptId) {
        try { await updateAttempt({ data: { id: attemptId, status: "failed", error: msg.slice(0, 500) } }); } catch { /* ignore */ }
      }
      toast.error(msg);
    } finally {
      setSwapping(false);
    }
  }

  const quoteAgeSec = quoteAt ? Math.floor((Date.now() - quoteAt) / 1000) : null;

  return (
    <Modal onClose={onClose} title="Swap on Arc · Circle App Kit">
      <div className="space-y-3">
        <TokenPicker label="From" token={tokenIn} onChange={setTokenIn} tokens={TOKENS} amount={amount} onAmount={setAmount} />
        <div className="flex justify-center -my-1">
          <button onClick={flip} disabled={swapping} className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-primary flex items-center justify-center disabled:opacity-40">
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </div>
        <TokenPicker label="To" token={tokenOut} onChange={setTokenOut} tokens={TOKENS} amount={quote ? Number(quote.amountOut).toFixed(6) : ""} readOnly />

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-xs space-y-1 min-h-[92px]">
          {loading && <p className="text-muted-foreground">Fetching quote from Arc…</p>}
          {err && <p className="text-destructive break-words">{err}</p>}
          {quote && !loading && (
            <>
              <div className="flex justify-between"><span className="text-muted-foreground">Rate</span><span className="font-mono">1 {tokenIn.symbol} ≈ {quote.rate.toFixed(6)} {tokenOut.symbol}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Min received</span><span className="font-mono">{Number(quote.stopLimit).toFixed(6)} {tokenOut.symbol}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Network gas</span><span className="font-mono">{gasGwei != null ? `${gasGwei.toFixed(2)} gwei` : "—"}</span></div>
              {quote.fees.slice(0, 2).map((f, i) => (
                <div key={i} className="flex justify-between"><span className="text-muted-foreground">Fee{f.type ? ` (${f.type})` : ""}</span><span className="font-mono">{Number(f.amount).toFixed(6)} {f.token}</span></div>
              ))}
              <div className="flex justify-between"><span className="text-muted-foreground">Quote age</span><span className="font-mono">{quoteAgeSec ?? 0}s (auto-refresh 12s)</span></div>
            </>
          )}
          {!loading && !err && !quote && <p className="text-muted-foreground">Enter an amount to see a live quote.</p>}
        </div>

        {(swapping || step) && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-xs space-y-2">
            <StepRow label="Refresh quote + gas" active={step === "quoting"} done={!!step && step !== "quoting" && step !== "failed"} />
            <StepRow label="Approve + sign in wallet (permit)" active={step === "awaiting-signature"} done={step === "broadcasting" || step === "confirming" || step === "confirmed"} />
            <StepRow label="Broadcast to Arc Testnet" active={step === "broadcasting"} done={step === "confirming" || step === "confirmed"} />
            <StepRow label="Wait for confirmation" active={step === "confirming"} done={step === "confirmed"} />
            {txHash && (
              <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-primary hover:underline font-mono break-all">
                {txHash.slice(0, 20)}… <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            )}
            {stepErr && <p className="text-destructive break-words">{stepErr}</p>}
            {step === "confirmed" && <p className="text-success">Confirmed on-chain.</p>}
          </div>
        )}

        <button
          onClick={execute}
          disabled={!quote || loading || swapping}
          className="w-full py-2.5 rounded-lg bg-gradient-to-r from-primary to-accent text-white font-medium disabled:opacity-50"
        >
          {swapping ? "Processing…" : `Swap ${tokenIn.symbol} → ${tokenOut.symbol}`}
        </button>
        <p className="text-[10px] text-muted-foreground text-center">
          Quote + gas are re-fetched right before you confirm. Approve + swap happen atomically via permit; your wallet will prompt one signature.
        </p>
      </div>
    </Modal>
  );
}

function StepRow({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  const color = done ? "text-success" : active ? "text-neon" : "text-muted-foreground";
  const dot = done ? "bg-success" : active ? "bg-primary animate-pulse" : "bg-zinc-700";
  return (
    <div className={`flex items-center gap-2 ${color}`}>
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      <span>{label}</span>
    </div>
  );
}

function TokenPicker({
  label, token, onChange, tokens, amount, onAmount, readOnly,
}: {
  label: string;
  token: import("@/lib/uniswap").Token;
  onChange: (t: import("@/lib/uniswap").Token) => void;
  tokens: import("@/lib/uniswap").Token[];
  amount: string;
  onAmount?: (v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-display tracking-widest text-muted-foreground">{label.toUpperCase()}</span>
        <select
          value={token.symbol}
          onChange={(e) => {
            const t = tokens.find((x) => x.symbol === e.target.value);
            if (t) onChange(t);
          }}
          className="bg-zinc-950 border border-zinc-800 rounded-md px-2 py-1 text-sm focus:outline-none focus:border-primary"
        >
          {tokens.map((t) => (
            <option key={t.symbol} value={t.symbol}>{t.symbol} — {t.name}</option>
          ))}
        </select>
      </div>
      <input
        type="number"
        value={amount}
        onChange={(e) => onAmount?.(e.target.value)}
        readOnly={readOnly}
        placeholder="0.0"
        className="w-full bg-transparent text-2xl font-mono outline-none disabled:opacity-60 read-only:opacity-70"
      />
    </div>
  );
}

type SwapRow = {
  id: string;
  token_in: string;
  token_out: string;
  amount_in: number;
  amount_out: number | null;
  min_received: number | null;
  tx_hash: string | null;
  explorer_url: string | null;
  status: string;
  error: string | null;
  gas_gwei: number | null;
  created_at: string;
};

function SwapHistory() {
  const [swaps, setSwaps] = useState<SwapRow[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchSwaps = useServerFn(listSwapAttempts);
  const patchSwap = useServerFn(updateSwapAttempt);

  async function load() {
    setLoading(true);
    try {
      const rows = await fetchSwaps().catch(() => [] as SwapRow[]);
      setSwaps(rows as SwapRow[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  useEffect(() => {
    const inflight = swaps.filter((s) => (s.status === "pending" || s.status === "broadcast") && s.tx_hash);
    if (inflight.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const s of inflight) {
        const res = await waitForReceipt(s.tx_hash!, { intervalMs: 4000, timeoutMs: 120_000 });
        if (cancelled || !res) continue;
        try {
          await patchSwap({ data: { id: s.id, status: res } });
          setSwaps((prev) => prev.map((r) => (r.id === s.id ? { ...r, status: res } : r)));
        } catch { /* ignore */ }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swaps.map((s) => `${s.id}:${s.status}`).join(",")]);

  return (
    <section className="panel border border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
        <h3 className="font-display tracking-widest text-sm text-muted-foreground">SWAP HISTORY</h3>
        <button onClick={load} disabled={loading} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 disabled:opacity-50">
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-zinc-900/60 text-xs font-display tracking-widest text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-2">PAIR</th>
            <th className="text-left px-4 py-2">AMOUNT</th>
            <th className="text-left px-4 py-2">MIN OUT</th>
            <th className="text-left px-4 py-2">GAS</th>
            <th className="text-left px-4 py-2">TX</th>
            <th className="text-left px-4 py-2">DATE</th>
            <th className="text-left px-4 py-2">STATUS</th>
          </tr>
        </thead>
        <tbody>
          {swaps.length === 0 && (
            <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No swaps yet. Use the Swap action above to trade on Arc Testnet.</td></tr>
          )}
          {swaps.map((s) => (
            <tr key={s.id} className="border-t border-zinc-800 hover:bg-zinc-900/40">
              <td className="px-4 py-3 font-mono">{s.token_in} → {s.token_out}</td>
              <td className="px-4 py-3 font-mono">{Number(s.amount_in).toFixed(4)}</td>
              <td className="px-4 py-3 font-mono text-muted-foreground">{s.min_received != null ? Number(s.min_received).toFixed(6) : "—"}</td>
              <td className="px-4 py-3 font-mono text-muted-foreground">{s.gas_gwei != null ? `${Number(s.gas_gwei).toFixed(1)} gwei` : "—"}</td>
              <td className="px-4 py-3 font-display text-xs">
                {s.tx_hash ? (
                  <a href={s.explorer_url ?? `https://testnet.arcscan.app/tx/${s.tx_hash}`} target="_blank" rel="noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1">
                    {s.tx_hash.slice(0, 10)}… <ExternalLink className="w-3 h-3" />
                  </a>
                ) : "—"}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{new Date(s.created_at).toLocaleString()}</td>
              <td className="px-4 py-3"><SwapStatusPill status={s.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function SwapStatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "border-warning/40 text-warning",
    broadcast: "border-warning/40 text-warning",
    success: "border-success/40 text-success",
    failed: "border-destructive/40 text-destructive",
  };
  return <span className={`px-2 py-0.5 rounded border text-xs font-display uppercase ${map[status] ?? "border-zinc-700 text-muted-foreground"}`}>{status}</span>;
}

function OnchainHistory({ address }: { address: string }) {
  const [txs, setTxs] = useState<ScanTx[]>([]);
  const [loading, setLoading] = useState(true);
  const me = address.toLowerCase();

  async function load() {
    setLoading(true);
    try {
      const rows = await scanTxList(address, 25).catch(() => [] as ScanTx[]);
      setTxs(rows);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [address]);

  return (
    <section className="panel border border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
        <h3 className="font-display tracking-widest text-sm text-muted-foreground">ONCHAIN TRANSACTIONS</h3>
        <button onClick={load} disabled={loading} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 disabled:opacity-50">
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-zinc-900/60 text-xs font-display tracking-widest text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-2">TYPE</th>
            <th className="text-left px-4 py-2">COUNTERPARTY</th>
            <th className="text-left px-4 py-2">VALUE</th>
            <th className="text-left px-4 py-2">TX</th>
            <th className="text-left px-4 py-2">DATE</th>
            <th className="text-left px-4 py-2">STATUS</th>
          </tr>
        </thead>
        <tbody>
          {txs.length === 0 && (
            <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
              {loading ? "Loading transactions…" : "No transactions yet on this address."}
            </td></tr>
          )}
          {txs.map((t) => {
            const fromMe = t.from?.toLowerCase() === me;
            const toMe = t.to?.toLowerCase() === me;
            const isContract = t.input && t.input !== "0x" && t.input.length > 2;
            const kind = fromMe && toMe ? "SELF" : isContract && fromMe ? "CONTRACT" : fromMe ? "SEND" : toMe ? "RECEIVE" : "TX";
            const counter = fromMe ? t.to : t.from;
            const failed = t.isError === "1" || t.txreceipt_status === "0";
            return (
              <tr key={t.hash} className="border-t border-zinc-800 hover:bg-zinc-900/40">
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 font-display text-xs ${kind === "SEND" ? "text-destructive" : kind === "RECEIVE" ? "text-success" : "text-muted-foreground"}`}>
                    {kind === "SEND" ? <ArrowUpRight className="w-3 h-3" /> : kind === "RECEIVE" ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowLeftRight className="w-3 h-3" />}
                    {kind}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{counter ? `${counter.slice(0, 8)}…${counter.slice(-4)}` : "—"}</td>
                <td className="px-4 py-3 font-mono">{fmtUnits(BigInt(t.value || "0"), 18, 6)}</td>
                <td className="px-4 py-3 font-display text-xs">
                  <a href={`${ARC_NETWORK.blockExplorerUrls[0]}/tx/${t.hash}`} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                    {t.hash.slice(0, 10)}… <ExternalLink className="w-3 h-3" />
                  </a>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(Number(t.timeStamp) * 1000).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded border text-xs font-display uppercase ${failed ? "border-destructive/40 text-destructive" : "border-success/40 text-success"}`}>
                    {failed ? "failed" : "success"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
