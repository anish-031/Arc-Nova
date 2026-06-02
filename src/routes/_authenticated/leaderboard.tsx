import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, Crown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard — ARC NOVA" }] }),
  component: LeaderboardPage,
});

type Row = { id: string; username: string | null; email: string | null; xp: number; level: number; streak: number };

function LeaderboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("users").select("id,username,email,xp,level,streak").order("xp", { ascending: false }).limit(50)
      .then(({ data }) => { setRows((data ?? []) as Row[]); setLoading(false); });
  }, []);

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Trophy className="text-warning" /> Arc Network Leaderboard</h1>
        <p className="text-muted-foreground">Live rankings of top operators by XP earned.</p>
      </div>

      {loading ? (
        <div className="panel border border-zinc-800 rounded-xl p-12 text-center text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="panel border border-zinc-800 rounded-xl p-12 text-center">
          <Trophy className="w-12 h-12 text-warning mx-auto" />
          <h2 className="text-xl font-bold mt-4">Coming Soon</h2>
          <p className="text-sm text-muted-foreground mt-1">Be the first operator to earn XP and claim the top spot.</p>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            {top3.map((u, i) => <PodiumCard key={u.id} user={u} rank={i + 1} />)}
          </div>

          {rest.length > 0 && (
            <div className="panel border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900/60 text-xs font-display tracking-widest text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3 w-16">RANK</th>
                    <th className="text-left px-4 py-3">OPERATOR</th>
                    <th className="text-right px-4 py-3">XP</th>
                    <th className="text-right px-4 py-3">LEVEL</th>
                    <th className="text-right px-4 py-3">STREAK</th>
                  </tr>
                </thead>
                <tbody>
                  {rest.map((u, i) => (
                    <tr key={u.id} className="border-t border-zinc-800 hover:bg-zinc-900/40">
                      <td className="px-4 py-3 font-display text-muted-foreground">#{i + 4}</td>
                      <td className="px-4 py-3">{u.username ?? u.email ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-neon font-mono">{u.xp.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">LVL {u.level}</td>
                      <td className="px-4 py-3 text-right">{u.streak}d</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function PodiumCard({ user, rank }: { user: Row; rank: number }) {
  const meta = rank === 1
    ? { Icon: Crown, color: "text-warning", border: "border-warning/60 glow-border" }
    : rank === 2
    ? { Icon: Medal, color: "text-zinc-300", border: "border-zinc-400/40" }
    : { Icon: Medal, color: "text-amber-700", border: "border-amber-700/40" };
  return (
    <div className={`panel border rounded-xl p-6 text-center ${meta.border}`}>
      <meta.Icon className={`w-10 h-10 mx-auto ${meta.color}`} />
      <p className="mt-2 font-display text-xs tracking-widest text-muted-foreground">RANK #{rank}</p>
      <h3 className="mt-1 text-lg font-bold">{user.username ?? user.email ?? "—"}</h3>
      <p className="mt-3 text-3xl font-bold text-neon">{user.xp.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">XP · LVL {user.level} · {user.streak}d streak</p>
    </div>
  );
}
