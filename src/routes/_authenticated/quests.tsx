import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Target, Check, Zap } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/quests")({
  head: () => ({ meta: [{ title: "Quests — ARC NOVA" }] }),
  component: QuestsPage,
});

type Quest = { id: string; quest_id: string; title: string; max_progress: number; xp_reward: number };

function QuestsPage() {
  const { user } = Route.useRouteContext();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [claimed, setClaimed] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.from("quests").select("*").eq("active", true).order("created_at", { ascending: false })
      .then(({ data }) => setQuests((data ?? []) as Quest[]));
    const local = localStorage.getItem(`claimed:${user.id}`);
    if (local) setClaimed(new Set(JSON.parse(local)));
  }, [user.id]);

  async function claim(q: Quest) {
    if (claimed.has(q.id)) return;
    // Increment user XP via direct upsert on users
    const { data: prof } = await supabase.from("users").select("id,xp,level").eq("auth_user_id", user.id).maybeSingle();
    if (!prof) { toast.error("Profile not ready"); return; }
    const newXp = Number(prof.xp) + q.xp_reward;
    const newLevel = Math.max(prof.level, Math.floor(newXp / 1000) + 1);
    const { error } = await supabase.from("users").update({ xp: newXp, level: newLevel }).eq("id", prof.id);
    if (error) { toast.error(error.message); return; }
    const next = new Set(claimed); next.add(q.id);
    setClaimed(next);
    localStorage.setItem(`claimed:${user.id}`, JSON.stringify([...next]));
    toast.success(`+${q.xp_reward} XP claimed`);
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Target className="text-primary" /> Quests</h1>
        <p className="text-muted-foreground">Complete quests to earn XP and level up.</p>
      </div>

      <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quests.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 panel border border-zinc-800 rounded-xl p-12 text-center text-muted-foreground">
            No active quests. Check back soon.
          </div>
        )}
        {quests.map((q) => {
          const done = claimed.has(q.id);
          return (
            <div key={q.id} className={`panel border rounded-xl p-5 ${done ? "border-success/40" : "border-zinc-800 hover:border-primary transition-colors"}`}>
              <p className="font-display text-[10px] tracking-widest text-muted-foreground">// {q.quest_id}</p>
              <h3 className="text-lg font-bold mt-1">{q.title}</h3>
              <div className="mt-4 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 text-neon text-xs font-semibold">
                  <Zap className="w-3 h-3" /> +{q.xp_reward} XP
                </span>
                <button onClick={() => claim(q)} disabled={done}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    done ? "bg-success/15 text-success border border-success/40" : "bg-gradient-to-r from-primary to-accent text-white"
                  }`}>
                  {done ? <><Check className="w-4 h-4 inline" /> Claimed</> : "Claim"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
