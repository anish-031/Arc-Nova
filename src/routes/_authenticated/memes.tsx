import { createFileRoute } from "@tanstack/react-router";
import { Rocket, Database, BarChart3, Users, Activity } from "lucide-react";

export const Route = createFileRoute("/_authenticated/memes")({
  head: () => ({ meta: [{ title: "MemeVault — ARC NOVA" }] }),
  component: MemeVaultPage,
});

function MemeVaultPage() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Rocket className="text-neon" /> MemeVault</h1>
          <p className="text-muted-foreground">Real database-backed XP and swap integration.</p>
        </div>
        <span className="px-3 py-1.5 rounded-lg bg-success/10 border border-success/40 text-success text-xs font-semibold">Coming Soon</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Database className="text-primary" />} label="Database" value="Connected" />
        <StatCard icon={<BarChart3 className="text-success" />} label="Swap API" value="Live" />
        <StatCard icon={<Users className="text-accent" />} label="XP Tracking" value="Enabled" />
        <StatCard icon={<Activity className="text-warning" />} label="Status" value="Coming Soon" />
      </div>

      <section className="panel border border-zinc-800 rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-bold">MemeVault is Coming Soon</h2>
        <p className="text-sm text-muted-foreground">We are building the MemeVault experience with an actual database, real XP tracking, and a live swap API.</p>

        <div className="rounded-lg border border-zinc-800 p-6 text-center bg-zinc-900/40">
          <p className="font-semibold">Stay tuned for the launch.</p>
          <p className="text-sm text-muted-foreground mt-1">This page will be updated once MemeVault is ready for real trading.</p>
        </div>

        <button disabled className="w-full py-3 rounded-lg bg-gradient-to-r from-primary/40 to-accent/40 text-white font-medium opacity-60">
          Coming Soon
        </button>
      </section>
    </main>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="panel border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-bold">{value}</p>
      </div>
    </div>
  );
}
