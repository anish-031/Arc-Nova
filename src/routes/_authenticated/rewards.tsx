import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Gift } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/rewards")({
  head: () => ({ meta: [{ title: "RewardHub — ARC NOVA" }] }),
  component: RewardsPage,
});

const BADGES = [
  { id: "top", name: "TOP NOVA", threshold: 1_000 },
  { id: "super", name: "SUPER NOVA", threshold: 10_000 },
  { id: "master", name: "MASTER NOVA", threshold: 100_000 },
  { id: "champion", name: "CHAMPION NOVA", threshold: 1_000_000 },
];

// 10,000 XP = $0.10 USDC → 100,000 XP = $1 USDC
const XP_PER_USDC = 100_000;
const MIN_CONVERT = 100_000;

function RewardsPage() {
  const { user } = Route.useRouteContext();
  const [xp, setXp] = useState(0);
  const [claimed, setClaimed] = useState<Set<string>>(new Set());
  const [convertAmt, setConvertAmt] = useState(MIN_CONVERT);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase.from("users").select("id,xp").eq("auth_user_id", user.id).maybeSingle();
    setXp(Number(data?.xp ?? 0));
  }
  useEffect(() => {
    load();
    const raw = localStorage.getItem(`badges:${user.id}`);
    if (raw) setClaimed(new Set(JSON.parse(raw)));
  }, [user.id]);

  function claim(b: typeof BADGES[number]) {
    if (xp < b.threshold) { toast.error("Not enough XP"); return; }
    if (claimed.has(b.id)) return;
    const next = new Set(claimed); next.add(b.id);
    setClaimed(next);
    localStorage.setItem(`badges:${user.id}`, JSON.stringify([...next]));
    toast.success(`${b.name} badge claimed!`);
  }

  async function convert() {
    if (convertAmt < MIN_CONVERT) { toast.error(`Minimum is ${MIN_CONVERT.toLocaleString()} XP`); return; }
    if (convertAmt > xp) { toast.error("Not enough XP"); return; }
    setBusy(true);
    try {
      const { data: prof } = await supabase.from("users").select("id,xp").eq("auth_user_id", user.id).maybeSingle();
      if (!prof) throw new Error("Profile not found");
      const newXp = Math.max(0, Number(prof.xp) - convertAmt);
      const { error } = await supabase.from("users").update({ xp: newXp }).eq("id", prof.id);
      if (error) throw error;
      const usdc = convertAmt / XP_PER_USDC;
      await supabase.from("purchases").insert({
        user_id: user.id, buyer_email: user.email ?? "",
        product_type: "marketplace", product_name: `XP Conversion → ${usdc} USDC`,
        price: -usdc, item_details: { xp_spent: convertAmt, usdc_credit: usdc }, status: "pending",
      });
      toast.success(`Converted to ${usdc} USDC — pending admin payout`);
      load();
    } catch (e: unknown) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  const usdcEarned = convertAmt / XP_PER_USDC;

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Gift className="text-accent w-6 h-6" /> Reward Hub</h1>
          <p className="text-muted-foreground text-sm mt-1">New Nova Badges — automatically awarded at thresholds</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total XP</p>
          <p className="text-2xl font-bold text-neon">{xp.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">≈ ${(xp / XP_PER_USDC).toFixed(4)} <span className="opacity-60">(10k XP = $0.1)</span></p>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {BADGES.map((b) => {
          const pct = Math.min(100, (xp / b.threshold) * 100);
          const ready = xp >= b.threshold;
          const isClaimed = claimed.has(b.id);
          return (
            <div key={b.id} className="panel border border-zinc-800 rounded-xl p-5 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold tracking-wider">{b.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Requires {b.threshold.toLocaleString()} XP</p>
                <div className="mt-2 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{pct.toFixed(0)}% of goal</p>
              </div>
              <button onClick={() => claim(b)} disabled={!ready || isClaimed}
                className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium border ${
                  isClaimed ? "border-success/40 text-success bg-success/10"
                  : ready ? "border-primary text-neon bg-primary/10 hover:bg-primary/20"
                  : "border-zinc-800 text-muted-foreground bg-zinc-900 cursor-not-allowed"
                }`}>
                {isClaimed ? "Claimed" : "Claim Badge"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-8 panel border border-zinc-800 rounded-xl p-6">
        <h3 className="font-bold">Convert XP to USDC</h3>
        <div className="mt-5 grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-muted-foreground">Current balance</p>
            <p className="text-2xl font-bold mt-1">{xp.toLocaleString()} XP</p>
            <p className="text-xs text-muted-foreground mt-0.5">Approx. {(xp / XP_PER_USDC).toFixed(6)} USDC</p>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">XP to convert</label>
            <input type="number" min={MIN_CONVERT} step={MIN_CONVERT} value={convertAmt}
              onChange={(e) => setConvertAmt(Number(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:border-primary" />
            <p className="text-xs text-muted-foreground mt-1">Rate: 100,000 XP = 1 USDC. Minimum conversion amount is 100,000 XP.</p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between flex-wrap gap-3 pt-4 border-t border-zinc-800">
          <p className="text-sm text-muted-foreground">You will receive <span className="text-neon font-semibold">{usdcEarned.toFixed(6)} USDC</span> for {convertAmt.toLocaleString()} XP.</p>
          <button onClick={convert} disabled={busy || convertAmt < MIN_CONVERT || convertAmt > xp}
            className="px-5 py-2 rounded-lg border border-primary text-neon bg-primary/10 hover:bg-primary/20 text-sm font-medium disabled:opacity-50">
            {busy ? "Converting…" : "Convert XP"}
          </button>
        </div>
      </div>
    </main>
  );
}
