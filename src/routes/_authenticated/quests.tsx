import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Twitter, Wallet as WalletIcon, Zap, Link as LinkIcon, Check, Gamepad2, Crown, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useWallet } from "@/hooks/use-wallet";

export const Route = createFileRoute("/_authenticated/quests")({
  head: () => ({ meta: [{ title: "Daily Quests — ARC NOVA" }] }),
  component: QuestsPage,
});

type Category = "daily" | "social" | "onchain" | "purchase";
type Quest = {
  id: string; title: string; desc: string; xp: number;
  category: Category; cta: string; href?: string;
  Icon: typeof Clock; auto?: boolean;
  /** product_type in `purchases` that satisfies this quest */
  requiresPurchaseType?: "topup" | "x-premium" | "marketplace";
};

const QUESTS: Quest[] = [
  { id: "daily-login", title: "Daily Login", desc: "Log in to ARC NOVA daily and keep your streak going",
    xp: 50, category: "daily", cta: "Claim Reward", Icon: Clock, auto: true },
  { id: "follow-arc", title: "Follow Arc on X", desc: "Follow @arc on X to stay updated with Arc Network announcements.",
    xp: 100, category: "social", cta: "Follow Arc on X", href: "https://x.com/arc", Icon: Twitter },
  { id: "follow-arcnova", title: "Follow ArcNova on X", desc: "Follow @arc__nova on X to stay connected with the ArcNova community.",
    xp: 100, category: "social", cta: "Follow ArcNova on X", href: "https://x.com/arc__nova", Icon: Twitter },
  { id: "connect-wallet", title: "Connect Wallet", desc: "Connect your Web3 wallet to Arc Testnet.",
    xp: 200, category: "onchain", cta: "Connect Wallet", Icon: WalletIcon },
  { id: "first-tx", title: "First Transaction", desc: "Send your first on-chain transaction on Arc Testnet.",
    xp: 500, category: "onchain", cta: "Open Wallet", href: "/wallet", Icon: Zap },
  { id: "buy-topup", title: "Buy a Game Top-Up", desc: "Purchase any product from the Games Top-Up section.",
    xp: 300, category: "purchase", cta: "Open Top-Up", href: "/topup", Icon: Gamepad2, requiresPurchaseType: "topup" },
  { id: "buy-xpremium", title: "Subscribe to X Premium", desc: "Buy any X Premium plan to unlock this quest.",
    xp: 400, category: "purchase", cta: "Open X Premium", href: "/x-premium", Icon: Crown, requiresPurchaseType: "x-premium" },
  { id: "buy-marketplace", title: "Buy from Marketplace", desc: "Purchase any item from the Marketplace.",
    xp: 300, category: "purchase", cta: "Open Marketplace", href: "/marketplace", Icon: ShoppingBag, requiresPurchaseType: "marketplace" },
];

const TABS: Array<{ id: "all" | Category; label: string }> = [
  { id: "all", label: "All" }, { id: "daily", label: "Daily" },
  { id: "social", label: "Social" }, { id: "onchain", label: "Onchain" },
  { id: "purchase", label: "Purchases" },
];

function QuestsPage() {
  const { user } = Route.useRouteContext();
  const { address } = useWallet();
  const [tab, setTab] = useState<"all" | Category>("all");
  const [claimed, setClaimed] = useState<Set<string>>(new Set());
  const [purchasedTypes, setPurchasedTypes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const raw = localStorage.getItem(`quests:${user.id}`);
    if (raw) setClaimed(new Set(JSON.parse(raw)));
  }, [user.id]);

  // Pull the user's verified purchases so quest progress reflects real data.
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("purchases")
        .select("product_type")
        .eq("user_id", user.id);
      if (data) setPurchasedTypes(new Set(data.map((r) => r.product_type as string)));
    })();
  }, [user.id]);

  const visible = useMemo(() => tab === "all" ? QUESTS : QUESTS.filter(q => q.category === tab), [tab]);
  const totalXp = QUESTS.reduce((s, q) => s + q.xp, 0);
  const earnedXp = QUESTS.filter(q => claimed.has(q.id)).reduce((s, q) => s + q.xp, 0);
  const doneCount = claimed.size;

  function isEligible(q: Quest): boolean {
    if (q.id === "connect-wallet") return !!address;
    if (q.requiresPurchaseType) return purchasedTypes.has(q.requiresPurchaseType);
    return true;
  }

  async function claim(q: Quest) {
    if (claimed.has(q.id)) return;
    if (q.id === "connect-wallet" && !address) { toast.error("Connect your wallet first"); return; }
    if (q.requiresPurchaseType && !purchasedTypes.has(q.requiresPurchaseType)) {
      toast.error("Complete a real purchase first — XP unlocks after payment is verified on-chain");
      return;
    }
    const { data: prof } = await supabase.from("users").select("id,xp,level").eq("auth_user_id", user.id).maybeSingle();
    if (!prof) { toast.error("Profile not ready"); return; }
    const newXp = Number(prof.xp) + q.xp;
    const newLevel = Math.max(prof.level, Math.floor(newXp / 1000) + 1);
    const { error } = await supabase.from("users").update({ xp: newXp, level: newLevel }).eq("id", prof.id);
    if (error) { toast.error(error.message); return; }
    const next = new Set(claimed); next.add(q.id);
    setClaimed(next);
    localStorage.setItem(`quests:${user.id}`, JSON.stringify([...next]));
    toast.success(`+${q.xp} XP claimed`);
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Daily Quests</h1>
          <p className="text-muted-foreground text-sm mt-1">Complete quests to earn XP and rewards</p>
        </div>
        <div className="flex gap-8 text-right">
          <div><p className="text-xs text-muted-foreground">Progress</p><p className="font-bold text-neon">{doneCount}/{QUESTS.length} Completed</p></div>
          <div><p className="text-xs text-muted-foreground">XP Earned</p><p className="font-bold text-neon">{earnedXp}/{totalXp} XP</p></div>
        </div>
      </div>

      <div className="mt-6 panel border border-primary/30 rounded-xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center"><Clock className="w-6 h-6 text-neon" /></div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold">Daily Progress</h3>
          <p className="text-sm text-muted-foreground">{doneCount} of {QUESTS.length} quests completed</p>
          <div className="mt-2 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${(doneCount / QUESTS.length) * 100}%` }} />
          </div>
        </div>
        <span className="px-3 py-1.5 rounded-lg bg-primary/15 text-neon text-sm font-semibold whitespace-nowrap">⚡ {earnedXp} XP</span>
      </div>

      <div className="mt-6 grid grid-cols-5 border-b border-zinc-800">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? "border-primary text-neon" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>{t.label}</button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {visible.map((q) => {
          const done = claimed.has(q.id);
          const eligible = isEligible(q);
          const pct = done ? 100 : eligible ? 50 : 0;
          return (
            <div key={q.id} className="panel border border-zinc-800 rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <q.Icon className="w-5 h-5 text-neon" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">{q.title}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">{q.desc}</p>
                    </div>
                    <span className="shrink-0 px-2.5 py-1 rounded-md bg-primary/15 text-neon text-xs font-semibold">⚡ {q.xp} XP</span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right">{done ? "1/1" : "0/1"}</span>
                    <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                  </div>
                  <div className="mt-3">
                    {done ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-success/40 bg-success/10 text-success text-sm">
                        <Check className="w-4 h-4" /> Completed
                      </span>
                    ) : q.requiresPurchaseType && !eligible && q.href ? (
                      <a href={q.href}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-700 bg-zinc-900 text-muted-foreground text-sm hover:border-zinc-600">
                        <q.Icon className="w-4 h-4" /> {q.cta}
                      </a>
                    ) : q.requiresPurchaseType && eligible ? (
                      <button onClick={() => claim(q)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-success/40 bg-success/10 text-success text-sm hover:bg-success/20">
                        <Check className="w-4 h-4" /> Claim {q.xp} XP
                      </button>
                    ) : q.href ? (
                      <a href={q.href} target={q.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer"
                        onClick={() => setTimeout(() => claim(q), 800)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-primary/40 bg-primary/10 text-neon text-sm hover:bg-primary/20">
                        <LinkIcon className="w-4 h-4" /> {q.cta}
                      </a>
                    ) : (
                      <button onClick={() => claim(q)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-primary/40 bg-primary/10 text-neon text-sm hover:bg-primary/20">
                        <q.Icon className="w-4 h-4" /> {q.cta}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
