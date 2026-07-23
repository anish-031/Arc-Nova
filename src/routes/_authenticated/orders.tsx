import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "My Orders — ARC NOVA" }] }),
  component: OrdersPage,
});

type Order = {
  id: string; product_name: string; product_type: string; price: number; status: string;
  tx_hash: string | null; custom_username: string | null; custom_uid: string | null;
  created_at: string; confirmed_at: string | null;
};

function OrdersPage() {
  const { user } = Route.useRouteContext();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    let active = true;
    const load = () =>
      supabase.from("purchases").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
        .then(({ data }) => { if (active) setOrders((data ?? []) as Order[]); });
    load();

    const channel = supabase
      .channel(`purchases:${user.id}`)
      .on("postgres_changes" as never,
        { event: "*", schema: "public", table: "purchases", filter: `user_id=eq.${user.id}` },
        () => load())
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, [user.id]);

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold">Order History</h1>
      <p className="text-muted-foreground mt-1">Pending orders require admin confirmation. You'll receive an email when confirmed.</p>

      <div className="mt-8 space-y-3">
        {orders.length === 0 && (
          <div className="panel border border-zinc-800 rounded-lg p-10 text-center text-muted-foreground">No orders yet.</div>
        )}
        {orders.map((o) => (
          <div key={o.id} className="panel border border-zinc-800 rounded-lg p-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-display text-[10px] tracking-widest text-muted-foreground">{o.product_type.toUpperCase()}</p>
              <h3 className="font-semibold text-neon">{o.product_name}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {o.custom_username && `X: ${o.custom_username} · `}
                {o.custom_uid && `UID: ${o.custom_uid} · `}
                {o.tx_hash && `tx: ${o.tx_hash.slice(0, 10)}…`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">${Number(o.price).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
              <span className={`mt-1 inline-block px-2 py-0.5 rounded border text-xs font-display uppercase ${
                o.status === "success" ? "border-success/40 text-success" :
                o.status === "failed" ? "border-destructive/40 text-destructive" :
                "border-warning/40 text-warning"
              }`}>{o.status === "pending" ? "Pending" : o.status === "success" ? "Fulfilled" : o.status}</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
