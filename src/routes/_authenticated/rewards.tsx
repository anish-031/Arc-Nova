import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Gift, Flame, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/rewards")({
  head: () => ({ meta: [{ title: "RewardHub — ARC NOVA" }] }),
  component: RewardsPage,
});

const REWARDS = [
  { id: "daily", title: "Daily Check-In", xp: 50, cooldown: 24, Icon: Flame, color: "from-orange-500 to-red-600" },
  { id: "weekly", title: "Weekly Streak Bonus", xp: 500, cooldown: 168, Icon: Sparkles, color: "from-purple-500 to-pink-600" },
  { id: "milestone", title: "Milestone Bonus", xp: 1000, cooldown: 720, Icon: Gift, color: "from-blue-500 to-cyan-600" },
];

function RewardsPage() {
  const { user } = Route.useRouteContext();
  const [last, setLast] = useState<Record<string, number>>({});
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const raw = localStorage.getItem(`rewards:${user.id}`);
    if (raw) setLast(JSON.parse(raw));
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, [user.id]);

  async function claim(r: typeof REWARDS[number]) {
    const since = now - (last[r.id] ?? 0);
    if (since < r.cooldown * 3600_000) {
      toast.error("Not yet — check back later");
      return;
    }
    const { data: prof } = await supabase.from("users").select("id,xp,level,streak").eq("auth_user_id", user.id).maybeSingle();
    if (!prof) return;
    const newXp = Number(prof.xp) + r.xp;
    const newLevel = Math.max(prof.level, Math.floor(newXp / 1000) + 1);
    const newStreak = r.id === "daily" ? prof.streak + 1 : prof.streak;
    await supabase.from("users").update({ xp: newXp, level: newLevel, streak: newStreak }).eq("id", prof.id);
    const next = { ...last, [r.id]: now };
    setLast(next);
    localStorage.setItem(`rewards:${user.id}`, JSON.stringify(next));
    toast.success(`+${r.xp} XP claimed`);
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Gift className="text-accent" /> RewardHub</h1>
        <p className="text-muted-foreground">Claim recurring rewards to grow your XP and streak.</p>
      </div>

      <div className="mt-8 grid md:grid-cols-3 gap-4">
        {REWARDS.map((r) => {
          const since = now - (last[r.id] ?? 0);
          const ready = since >= r.cooldown * 3600_000;
          const hoursLeft = Math.max(0, r.cooldown - since / 3600_000);
          return (
            <div key={r.id} className={`relative overflow-hidden panel border border-zinc-800 rounded-xl p-6`}>
              <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br ${r.color} opacity-20 blur-2xl`} />
              <r.Icon className="w-7 h-7 text-neon" />
              <h3 className="text-lg font-bold mt-3">{r.title}</h3>
              <p className="text-3xl font-bold text-neon mt-3">+{r.xp} XP</p>
              <p className="text-xs text-muted-foreground mt-1">{ready ? "Ready to claim" : `Cooldown: ${hoursLeft.toFixed(1)}h left`}</p>
              <button onClick={() => claim(r)} disabled={!ready}
                className={`mt-5 w-full py-2.5 rounded-lg font-medium transition-opacity ${
                  ready ? "bg-gradient-to-r from-primary to-accent text-white" : "bg-zinc-900 border border-zinc-800 text-muted-foreground"
                }`}>
                {ready ? "Claim" : "Locked"}
              </button>
            </div>
          );
        })}
      </div>
    </main>
  );
}
