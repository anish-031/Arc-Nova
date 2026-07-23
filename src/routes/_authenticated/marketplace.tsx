import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Search, Star, Gift } from "lucide-react";
import { payUSD } from "@/lib/pay";
import { recordVerifiedPurchase } from "@/lib/purchases.functions";

export const Route = createFileRoute("/_authenticated/marketplace")({
  head: () => ({ meta: [{ title: "Gift Card Marketplace — ARC NOVA" }] }),
  component: MarketplacePage,
});

type Card = {
  id: string; name: string; letter: string; color: string;
  min: number; max: number; off: number; popular?: boolean;
};

const CARDS: Card[] = [
  { id: "googleplay", name: "Google Play", letter: "G", color: "bg-green-600", min: 10, max: 100, off: 5, popular: true },
  { id: "apple", name: "Apple", letter: "A", color: "bg-zinc-400", min: 25, max: 200, off: 3, popular: true },
  { id: "amazon", name: "Amazon", letter: "A", color: "bg-orange-500", min: 25, max: 500, off: 4, popular: true },
  { id: "netflix", name: "Netflix", letter: "N", color: "bg-red-600", min: 25, max: 100, off: 4, popular: true },
  { id: "steam", name: "Steam", letter: "S", color: "bg-zinc-700", min: 10, max: 100, off: 6 },
  { id: "spotify", name: "Spotify", letter: "S", color: "bg-emerald-600", min: 10, max: 60, off: 5 },
  { id: "playstation", name: "PlayStation", letter: "P", color: "bg-blue-600", min: 20, max: 100, off: 5 },
  { id: "xbox", name: "Xbox", letter: "X", color: "bg-zinc-700", min: 25, max: 100, off: 5 },
  { id: "uber", name: "Uber", letter: "U", color: "bg-zinc-800", min: 25, max: 100, off: 3 },
  { id: "doordash", name: "DoorDash", letter: "D", color: "bg-red-500", min: 25, max: 100, off: 4 },
];

function MarketplacePage() {
  const { user } = Route.useRouteContext();
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Card | null>(null);

  const filtered = useMemo(
    () => CARDS.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())),
    [search],
  );
  const popular = filtered.filter((c) => c.popular);

  return (
    <main className="relative max-w-7xl mx-auto px-6 py-10">
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/35 backdrop-blur-lg backdrop-saturate-[0.2] backdrop-brightness-[0.85] rounded-lg pointer-events-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-neon tracking-tight">Coming Soon After Mainnet</h2>
        <p className="mt-2 text-sm text-zinc-300 text-center">The gift card marketplace will be unlocked once the Arc network is live.</p>
      </div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Gift Card Marketplace</h1>
          <p className="text-muted-foreground mt-1">Buy gift cards with USDC instantly</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search gift cards..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary" />
        </div>
      </div>

      <div className="mt-6 inline-flex p-1 bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-md mx-auto">
        {(["buy", "sell"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t ? "bg-zinc-800 text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}>
            {t === "buy" ? "Buy Gift Cards" : "Sell Gift Cards"}
          </button>
        ))}
      </div>

      {tab === "buy" ? (
        <>
          {popular.length > 0 && (
            <section className="mt-8">
              <h2 className="flex items-center gap-2 font-semibold mb-3"><Star className="w-4 h-4 text-warning" /> Popular</h2>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {popular.map((c) => <CardTile key={c.id} c={c} onClick={() => setOpen(c)} />)}
              </div>
            </section>
          )}
          <section className="mt-8">
            <h2 className="font-semibold mb-3">All Gift Cards</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {filtered.map((c) => <CardTile key={"all-" + c.id} c={c} onClick={() => setOpen(c)} />)}
            </div>
          </section>
        </>
      ) : (
        <div className="mt-8 panel border border-zinc-800 rounded-xl p-12 text-center">
          <Gift className="w-12 h-12 mx-auto text-muted-foreground" />
          <h3 className="text-xl font-bold mt-4">Sell Your Gift Cards</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Have unused gift cards? Sell them for USDC at competitive rates. Coming soon!
          </p>
          <button disabled className="mt-5 px-5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-muted-foreground text-sm">
            Coming Soon
          </button>
        </div>
      )}

      {open && <BuyModal card={open} user={user} onClose={() => setOpen(null)} />}
    </main>
  );
}

function CardTile({ c, onClick }: { c: Card; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="relative text-left panel border border-zinc-800 rounded-xl p-4 hover:border-primary transition-colors">
      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-success/20 text-success text-[10px] font-semibold">
        {c.off}% OFF
      </div>
      <div className={`w-11 h-11 rounded-lg ${c.color} flex items-center justify-center text-white font-bold text-lg`}>
        {c.letter}
      </div>
      <h3 className="font-semibold mt-6">{c.name}</h3>
      <p className="text-xs text-muted-foreground">${c.min} - ${c.max}</p>
    </button>
  );
}

function BuyModal({ card, user, onClose }: { card: Card; user: { id: string; email?: string }; onClose: () => void }) {
  const [amount, setAmount] = useState<number>(card.min);
  const [busy, setBusy] = useState(false);
  const record = useServerFn(recordVerifiedPurchase);
  const final = amount - (amount * card.off) / 100;

  async function buy(e: React.FormEvent) {
    e.preventDefault();
    if (amount < card.min || amount > card.max) {
      toast.error(`Amount must be $${card.min}-$${card.max}`); return;
    }
    setBusy(true);
    try {
      const { hash, valueWei } = await payUSD(final);
      await record({ data: {
        txHash: hash, expectedValueWei: valueWei,
        productType: "marketplace",
        productName: `${card.name} Gift Card $${amount}`,
        priceUsd: final,
        itemDetails: { card: card.id, face_value: amount, discount: card.off },
      } });
      toast.success("Payment verified on-chain — pending delivery");
      onClose();
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Payment failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={buy} onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md panel border border-zinc-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-lg ${card.color} flex items-center justify-center text-white font-bold text-xl`}>{card.letter}</div>
          <div>
            <h3 className="text-xl font-bold">{card.name}</h3>
            <p className="text-xs text-muted-foreground">{card.off}% off • ${card.min}-${card.max}</p>
          </div>
        </div>
        <div>
          <label className="block text-xs font-display tracking-widest text-muted-foreground mb-1">FACE VALUE (USD)</label>
          <input type="number" min={card.min} max={card.max} value={amount}
            onChange={(e) => setAmount(Number(e.target.value))} required
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:border-primary" />
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3 text-sm space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">Face value</span><span>${amount}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-success">-{card.off}%</span></div>
          <div className="flex justify-between font-semibold pt-1 border-t border-zinc-800"><span>You pay</span><span className="text-neon">${final.toFixed(2)} USDC</span></div>
        </div>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-zinc-800 hover:border-zinc-600">Cancel</button>
          <button disabled={busy} className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-primary to-accent text-white font-medium disabled:opacity-50">
            {busy ? "Confirming…" : "Pay & Buy"}
          </button>
        </div>
      </form>
    </div>
  );
}
