import { createFileRoute, Link } from "@tanstack/react-router";
import { Store, ShoppingBag, Gamepad2, Twitter, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/marketplace")({
  head: () => ({ meta: [{ title: "Marketplace — ARC NOVA" }] }),
  component: MarketplacePage,
});

const CATEGORIES = [
  { to: "/store", label: "Store", desc: "Premium digital items, listed by admins.", Icon: ShoppingBag, color: "from-blue-600 to-cyan-600" },
  { to: "/topup", label: "Game Top-Up", desc: "Instant crypto top-ups for popular titles.", Icon: Gamepad2, color: "from-orange-600 to-red-600" },
  { to: "/x-premium", label: "X Premium", desc: "Subscribe to X Premium with crypto.", Icon: Twitter, color: "from-sky-500 to-indigo-600" },
] as const;

function MarketplacePage() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Store className="text-primary" /> Marketplace</h1>
        <p className="text-muted-foreground">Everything you can buy across the ARC NOVA hub.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {CATEGORIES.map(({ to, label, desc, Icon, color }) => (
          <Link key={to} to={to}
            className="relative overflow-hidden panel border border-zinc-800 rounded-xl p-6 hover:border-primary transition-colors group">
            <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gradient-to-br ${color} opacity-20 blur-2xl group-hover:opacity-40 transition-opacity`} />
            <Icon className="w-8 h-8 text-neon" />
            <h3 className="text-xl font-bold mt-4">{label}</h3>
            <p className="text-sm text-muted-foreground mt-1">{desc}</p>
            <p className="mt-4 inline-flex items-center gap-1 text-sm text-neon">
              Browse <Sparkles className="w-4 h-4" />
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
