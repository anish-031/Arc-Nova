import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Twitter, Crown, Check, Sparkles } from "lucide-react";
import { payUSD } from "@/lib/pay";
import { recordVerifiedPurchase } from "@/lib/purchases.functions";

export const Route = createFileRoute("/_authenticated/x-premium")({
  head: () => ({ meta: [{ title: "X Premium — ARC NOVA" }] }),
  component: XPremiumPage,
});

type Plan = {
  id: string; tier: string; duration: string; price: number;
  features: string[]; popular?: boolean;
};

const PLANS: Plan[] = [
  { id: "p3", tier: "Premium", duration: "3 months", price: 4.5, features: ["All Basic features", "Blue checkmark"] },
  { id: "pp3", tier: "Premium+", duration: "3 months", price: 13, features: ["All Premium features", "Largest boost", "No ads"], popular: true },
  { id: "p6", tier: "Premium", duration: "6 months", price: 7, features: ["All Basic features", "Blue checkmark"] },
  { id: "pp6", tier: "Premium+", duration: "6 months", price: 15, features: ["All Premium features", "Largest boost", "No ads"] },
];

function XPremiumPage() {
  const { user } = Route.useRouteContext();
  const [selected, setSelected] = useState<Plan | null>(null);

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <div className="text-center">
        <div className="flex justify-center gap-2 mb-3">
          <Twitter className="w-7 h-7 text-neon" />
          <Crown className="w-7 h-7 text-warning" />
        </div>
        <h1 className="text-3xl font-bold">X Premium</h1>
        <p className="text-muted-foreground mt-1">Subscribe to X Premium using crypto. Get verified, unlock features, and support creators.</p>
      </div>

      <div className="mt-10 grid md:grid-cols-3 gap-5">
        {PLANS.map((p) => (
          <PlanCard key={p.id} plan={p} onSelect={() => setSelected(p)} />
        ))}
      </div>

      {selected && <CheckoutModal plan={selected} user={user} onClose={() => setSelected(null)} />}
    </main>
  );
}

function PlanCard({ plan, onSelect }: { plan: Plan; onSelect: () => void }) {
  const outOfStock = plan.tier === "Premium+";
  return (
    <div className={`relative panel border rounded-xl p-6 transition-all ${
      outOfStock ? "opacity-70 border-zinc-800" : "hover:scale-[1.02]"
    } ${plan.popular && !outOfStock ? "border-primary glow-border" : "border-zinc-800"}`}>
      {plan.popular && !outOfStock && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-primary to-accent text-white text-xs font-semibold flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Most Popular
        </div>
      )}
      {outOfStock && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-destructive/90 text-white text-xs font-semibold">
          Out of Stock
        </div>
      )}
      <h3 className="text-xl font-bold">{plan.tier} ({plan.duration})</h3>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-4xl font-bold text-neon">${plan.price}</span>
        <span className="text-sm text-muted-foreground">/{plan.duration}</span>
      </div>
      <ul className="mt-5 space-y-2">
        {plan.features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-success" /> {f}
          </li>
        ))}
      </ul>
      <button onClick={onSelect} disabled={outOfStock}
        className="mt-6 w-full py-2.5 rounded-lg bg-gradient-to-r from-primary to-accent text-white font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">
        {outOfStock ? "Out of Stock" : "Subscribe"}
      </button>
    </div>
  );
}

function CheckoutModal({ plan, user, onClose }: { plan: Plan; user: { id: string; email?: string }; onClose: () => void }) {
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const record = useServerFn(recordVerifiedPurchase);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) { toast.error("Enter your X username"); return; }
    setBusy(true);
    try {
      const { hash, valueWei } = await payUSD(plan.price);
      await record({ data: {
        txHash: hash, expectedValueWei: valueWei,
        productType: "x-premium",
        productName: `X ${plan.tier} (${plan.duration})`,
        priceUsd: plan.price, customUsername: username.trim(),
      } });
      toast.success("Payment verified on-chain — pending admin delivery");
      onClose();
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Payment failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md panel border border-zinc-800 rounded-xl p-6 space-y-4">
        <h3 className="text-xl font-bold">{plan.tier} ({plan.duration})</h3>
        <p className="text-sm text-muted-foreground">${plan.price}</p>
        <div>
          <label className="block text-xs font-display tracking-widest text-muted-foreground mb-1">X USERNAME (REQUIRED)</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="@yourhandle" maxLength={64}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:border-primary" />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-zinc-800 hover:border-zinc-600">Cancel</button>
          <button disabled={busy} className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-primary to-accent text-white font-medium disabled:opacity-50">
            {busy ? "Confirming…" : "Pay & Subscribe"}
          </button>
        </div>
      </form>
    </div>
  );
}
