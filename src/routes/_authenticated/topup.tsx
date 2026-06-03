import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { payUSD } from "@/lib/pay";
import { recordVerifiedPurchase } from "@/lib/purchases.functions";

export const Route = createFileRoute("/_authenticated/topup")({
  head: () => ({ meta: [{ title: "Game Top-Up — ARC NOVA" }] }),
  component: TopUpPage,
});

type Game = {
  id: string;
  name: string;
  currency: string;
  icon: string;
  gradient: string;
  // diamonds/coins per $1
  rate: number;
};

const GAMES: Game[] = [
  { id: "freefire", name: "Free Fire", currency: "Diamonds", icon: "🔥", gradient: "from-orange-600 to-red-700", rate: 100 },
  { id: "pubg", name: "PUBG Mobile", currency: "UC", icon: "🎯", gradient: "from-amber-600 to-yellow-700", rate: 80 },
  { id: "ml", name: "Mobile Legends", currency: "Diamonds", icon: "⚔️", gradient: "from-indigo-700 to-blue-800", rate: 90 },
  { id: "cod", name: "COD Mobile", currency: "CP", icon: "🎮", gradient: "from-zinc-600 to-zinc-800", rate: 85 },
];

const AMOUNTS_DEFAULT = [5, 10, 25, 50, 100];
const AMOUNTS_FREEFIRE = [1, 5, 10, 25, 50, 100];


function TopUpPage() {
  const [game, setGame] = useState<Game>(GAMES[0]);
  const [amount, setAmount] = useState<number>(25);
  const [uid, setUid] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const record = useServerFn(recordVerifiedPurchase);

  const receive = useMemo(() => amount * game.rate, [amount, game.rate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!uid.trim()) { toast.error("Enter your in-game UID"); return; }
    setSubmitting(true);
    try {
      const { hash, valueWei } = await payUSD(amount);
      await record({ data: {
        txHash: hash, expectedValueWei: valueWei,
        productType: "topup",
        productName: `${game.name} — ${receive.toLocaleString()} ${game.currency}`,
        priceUsd: amount, customUid: uid.trim(),
        itemDetails: { game: game.id, currency: game.currency, quantity: receive },
      } });
      toast.success("Payment verified on-chain — pending admin delivery");
      setUid("");
    } catch (e: unknown) {
      toast.error((e as { message?: string }).message ?? "Payment failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold">Game Top-Up</h1>
      <p className="text-muted-foreground mt-1">Top up directly with crypto. Instant in-game delivery after admin confirmation.</p>

      <div className="mt-8 grid lg:grid-cols-[1fr_400px] gap-6">
        {/* Game grid */}
        <section>
          <p className="font-display text-xs tracking-widest text-muted-foreground mb-3">CHOOSE GAME</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {GAMES.map((g) => {
              const active = g.id === game.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGame(g)}
                  className={`relative text-left rounded-xl p-5 h-44 overflow-hidden bg-gradient-to-br ${g.gradient} transition-all ${
                    active ? "ring-2 ring-primary scale-[1.02]" : "ring-1 ring-zinc-800 hover:ring-zinc-600"
                  }`}
                >
                  <div className="text-3xl">{g.icon}</div>
                  <div className="absolute bottom-4 left-5 right-5">
                    <h3 className="text-lg font-bold text-white drop-shadow">{g.name}</h3>
                    <p className="text-xs text-white/80">{g.currency}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Form panel */}
        <form onSubmit={submit} className="panel border border-zinc-800 rounded-xl p-6 space-y-5 h-fit lg:sticky lg:top-20">
          <div>
            <label className="block text-xs font-display tracking-widest text-muted-foreground mb-2">PLAYER ID / UID</label>
            <input
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              placeholder="Enter your UID"
              required
              maxLength={64}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-display tracking-widest text-muted-foreground mb-2">AMOUNT (USDC)</label>
            <div className="grid grid-cols-5 gap-2">
              {AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAmount(a)}
                  className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    amount === a
                      ? "bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/30"
                      : "bg-zinc-900 border border-zinc-800 text-foreground hover:border-zinc-600"
                  }`}
                >
                  ${a}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 space-y-2 text-sm">
            <Row k="Game" v={game.name} />
            <Row k="Receive" v={`${receive.toLocaleString()} ${game.currency}`} highlight />
            <Row k="Pay" v={`$${amount} USDC`} highlight />
          </div>

          <button
            disabled={submitting}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-primary to-accent text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-primary/30"
          >
            ⚡ {submitting ? "Confirming…" : "Pay & Top Up"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Row({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className={highlight ? "font-semibold text-neon" : "text-foreground"}>{v}</span>
    </div>
  );
}
