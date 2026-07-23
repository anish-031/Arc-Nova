import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { healProfile, type Profile } from "@/lib/profile";
import { useWallet } from "@/hooks/use-wallet";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { listSwapAttempts, updateSwapAttempt } from "@/lib/swaps.functions";
import { waitForReceipt } from "@/lib/uniswap";
import { ExternalLink, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — ARC NOVA" }] }),
  component: DashboardPage,
});

type Purchase = {
  id: string;
  product_name: string;
  product_type: string;
  price: number;
  status: string;
  created_at: string;
  tx_hash: string | null;
};

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

function DashboardPage() {
  const { user } = Route.useRouteContext();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [swaps, setSwaps] = useState<SwapRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { address } = useWallet();

  const fetchSwaps = useServerFn(listSwapAttempts);
  const patchSwap = useServerFn(updateSwapAttempt);

  async function load(walletAddr?: string | null) {
    setLoading(true);
    try {
      const p = await healProfile(user, walletAddr ?? address ?? null);
      setProfile(p);
      const [{ data: orders }, swapRows] = await Promise.all([
        supabase
          .from("purchases")
          .select("id,product_name,product_type,price,status,created_at,tx_hash")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10),
        fetchSwaps().catch(() => [] as SwapRow[]),
      ]);
      setPurchases((orders ?? []) as Purchase[]);
      setSwaps(swapRows as SwapRow[]);
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message ?? "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user.id]);

  // Poll on-chain status for any swap still pending/broadcast.
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


  if (loading || !profile) {
    return <div className="max-w-7xl mx-auto px-6 py-12 font-display text-muted-foreground">// LOADING TERMINAL...</div>;
  }

  const xpForNext = profile.level * 1000;
  const xpProgress = Math.min(100, Math.round((Number(profile.xp) % xpForNext) / xpForNext * 100));

  return (
    <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="font-display text-xs tracking-widest text-muted-foreground">Account</p>
          <h1 className="text-3xl font-bold mt-1">{profile.username ?? user.email}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Panel label="EXP" value={profile.xp.toLocaleString()}>
          <div className="mt-3 h-1.5 rounded bg-zinc-800 overflow-hidden">
            <div className="h-full bg-primary glow-border" style={{ width: `${xpProgress}%` }} />
          </div>
          <p className="mt-2 text-[10px] font-display text-muted-foreground">{xpProgress}% → LVL {profile.level + 1}</p>
        </Panel>
        <Panel label="LEVEL" value={`LVL ${profile.level}`} accent />
        <Panel label="STREAK" value={`${profile.streak}d`} />
        <Panel label="INVITES" value={String(profile.invites)} />
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display tracking-widest text-sm text-muted-foreground">RECENT ORDERS</h2>
          <span className="text-xs text-muted-foreground">{purchases.length} entries</span>
        </div>
        <div className="panel border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/60 text-xs font-display tracking-widest text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">PRODUCT</th>
                <th className="text-left px-4 py-2">TYPE</th>
                <th className="text-left px-4 py-2">PRICE</th>
                <th className="text-left px-4 py-2">TX</th>
                <th className="text-left px-4 py-2">DATE</th>
                <th className="text-left px-4 py-2">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {purchases.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No orders yet. Visit the store.</td></tr>
              )}
              {purchases.map((p) => (
                <tr key={p.id} className="border-t border-zinc-800 hover:bg-zinc-900/40">
                  <td className="px-4 py-3">{p.product_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.product_type}</td>
                  <td className="px-4 py-3">${Number(p.price).toFixed(2)}</td>
                  <td className="px-4 py-3 font-display text-xs text-muted-foreground">{p.tx_hash ? `${p.tx_hash.slice(0, 8)}…` : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display tracking-widest text-sm text-muted-foreground">RECENT SWAPS</h2>
          <button onClick={() => load()} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
        <div className="panel border border-zinc-800 rounded-lg overflow-hidden">
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
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No swaps yet. Open the wallet and swap on Arc Testnet.</td></tr>
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
                  <td className="px-4 py-3"><StatusPill status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Panel({ label, value, accent, children }: { label: string; value: string; accent?: boolean; children?: React.ReactNode }) {
  return (
    <div className="panel border border-zinc-800 rounded-lg p-5 hover:border-primary transition-colors">
      <p className="font-display text-[10px] tracking-widest text-muted-foreground">// {label}</p>
      <p className={`mt-2 text-3xl font-bold ${accent ? "text-accent" : "text-neon"}`}>{value}</p>
      {children}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "border-warning/40 text-warning",
    success: "border-success/40 text-success",
    failed: "border-destructive/40 text-destructive",
  };
  return <span className={`px-2 py-0.5 rounded border text-xs font-display uppercase ${map[status] ?? "border-zinc-700 text-muted-foreground"}`}>{status}</span>;
}
