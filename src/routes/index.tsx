import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ARC NOVA — Cyberpunk Marketplace & Web3 Hub" },
      { name: "description", content: "Buy X-Premium, top up tokens, trade marketplace items. Connect your wallet on Arc Network, earn XP and level up." },
      { property: "og:title", content: "ARC NOVA — Cyberpunk Marketplace & Web3 Hub" },
      { property: "og:description", content: "Gamified Web3 marketplace. Connect, earn XP, level up." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen relative scanline">
      <header className="border-b border-zinc-800 bg-zinc-950/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="font-display tracking-widest text-neon text-lg">ARC&nbsp;NOVA</Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link to="/auth" className="px-3 py-1.5 rounded border border-zinc-800 hover:border-primary hover:text-neon transition-all">Sign in</Link>
          </nav>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-24">
        <p className="font-display text-xs tracking-[0.3em] text-muted-foreground mb-4">// SYSTEM ONLINE</p>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
          Plug into the <span className="text-neon">grid</span>.<br/>
          Trade on <span className="text-accent">Arc</span>.
        </h1>
        <p className="mt-6 max-w-xl text-muted-foreground text-lg">
          ARC NOVA is a gamified Web3 marketplace. Buy X-Premium, top up tokens, list marketplace items, and earn XP for every move.
        </p>
        <div className="mt-10 flex gap-3">
          <Link to="/auth" className="px-5 py-3 rounded bg-primary text-primary-foreground font-medium glow-border hover:opacity-90 transition-opacity">Enter the Network</Link>
          <Link to="/store" className="px-5 py-3 rounded border border-zinc-800 hover:border-primary transition-all">Browse Store</Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-4">
        {[
          { t: "X-Premium", d: "Boost your account with verified premium status." },
          { t: "Token Topup", d: "Drop ARC tokens straight into any UID, instantly." },
          { t: "Marketplace", d: "List, browse and trade digital goods." },
        ].map((f) => (
          <div key={f.t} className="panel border border-zinc-800 rounded-lg p-6 hover:border-primary transition-colors">
            <p className="font-display text-xs text-muted-foreground mb-2">// MODULE</p>
            <h3 className="text-xl font-semibold text-neon">{f.t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
