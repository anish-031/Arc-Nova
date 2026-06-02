import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { confirmOrder, createProduct, createQuest } from "@/lib/admin.functions";
import { toast } from "sonner";

const MASTER_EMAIL = "mastergupta299@gmail.com";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — ARC NOVA" }] }),
  beforeLoad: async ({ context }) => {
    const u = (context as { user: { id: string; email?: string } }).user;
    if (u.email === MASTER_EMAIL) return;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.id).eq("role", "admin").maybeSingle();
    if (!data) throw redirect({ to: "/dashboard" });
  },
  component: AdminPage,
});

type Tab = "orders" | "users" | "email" | "create";

function AdminPage() {
  const [tab, setTab] = useState<Tab>("orders");
  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="font-display text-xs tracking-widest text-accent">// ADMIN COMMAND CENTER</p>
          <h1 className="text-3xl font-bold mt-1">Operations</h1>
        </div>
      </div>

      <div className="mt-6 border-b border-zinc-800 flex flex-wrap gap-1">
        {(["orders", "users", "email", "create"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-display tracking-widest uppercase border-b-2 transition-colors ${
              tab === t ? "border-primary text-neon" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {t === "orders" ? "Orders" : t === "users" ? "Users" : t === "email" ? "Email" : "Create"}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "orders" && <OrdersTab />}
        {tab === "users" && <UsersTab />}
        {tab === "email" && <EmailTab />}
        {tab === "create" && <CreateTab />}
      </div>
    </main>
  );
}

/* ---------- Tab A: Orders ---------- */

type AdminOrder = {
  id: string; buyer_email: string; product_name: string; product_type: string;
  price: number; tx_hash: string | null; custom_username: string | null; custom_uid: string | null;
  item_details: unknown; status: string; created_at: string;
};

function OrdersTab() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const confirm = useServerFn(confirmOrder);

  async function load() {
    const { data } = await supabase.from("purchases").select("*").order("created_at", { ascending: false });
    setOrders((data ?? []) as AdminOrder[]);
  }
  useEffect(() => { load(); }, []);

  const filtered = filter === "all" ? orders : orders.filter((o) => o.product_type === filter);

  async function handleConfirm(id: string) {
    try {
      const res = await confirm({ data: { purchaseId: id } });
      toast.success(res.emailed ? "Order confirmed + email sent" : "Order confirmed (email failed — check SMTP)");
      load();
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Failed to confirm");
    }
  }

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {["all", "x-premium", "topup", "marketplace"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded border text-xs font-display uppercase tracking-widest transition-colors ${
              filter === f ? "border-primary text-neon" : "border-zinc-800 text-muted-foreground hover:border-zinc-700"
            }`}>{f}</button>
        ))}
      </div>

      <div className="panel border border-zinc-800 rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-zinc-900/60 text-xs font-display tracking-widest text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2">BUYER</th>
              <th className="text-left px-4 py-2">PRODUCT</th>
              <th className="text-left px-4 py-2">CUSTOM</th>
              <th className="text-left px-4 py-2">TX HASH</th>
              <th className="text-left px-4 py-2">PRICE</th>
              <th className="text-left px-4 py-2">STATUS</th>
              <th className="text-left px-4 py-2">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No orders.</td></tr>}
            {filtered.map((o) => (
              <tr key={o.id} className="border-t border-zinc-800 hover:bg-zinc-900/40">
                <td className="px-4 py-3">{o.buyer_email}</td>
                <td className="px-4 py-3"><span className="text-xs font-display text-muted-foreground">{o.product_type}</span><br/>{o.product_name}</td>
                <td className="px-4 py-3 text-xs">
                  {o.product_type === "x-premium" && <span>X: <span className="text-neon">{o.custom_username ?? "—"}</span></span>}
                  {o.product_type === "topup" && <span>UID: <span className="text-neon">{o.custom_uid ?? "—"}</span></span>}
                  {o.product_type === "marketplace" && <span className="text-muted-foreground">{JSON.stringify(o.item_details)}</span>}
                </td>
                <td className="px-4 py-3 font-display text-xs text-muted-foreground">{o.tx_hash ? `${o.tx_hash.slice(0, 12)}…` : "—"}</td>
                <td className="px-4 py-3">${Number(o.price).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded border text-xs font-display uppercase ${
                    o.status === "success" ? "border-success/40 text-success" : "border-warning/40 text-warning"
                  }`}>{o.status}</span>
                </td>
                <td className="px-4 py-3">
                  {o.status === "pending" ? (
                    <button onClick={() => handleConfirm(o.id)}
                      className="px-3 py-1.5 rounded bg-success/15 text-success border border-success/40 text-xs font-display uppercase tracking-widest hover:bg-success/25 transition-colors">
                      Confirm
                    </button>
                  ) : <span className="text-xs text-muted-foreground">✓ Done</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Tab B: Users ---------- */

type AdminUser = { id: string; email: string | null; address: string | null; xp: number; level: number; streak: number; created_at: string };

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase.from("users").select("id,email,address,xp,level,streak,created_at").order("created_at", { ascending: false })
      .then(({ data }) => setUsers((data ?? []) as AdminUser[]));
  }, []);

  const filtered = q
    ? users.filter((u) => (u.email ?? "").toLowerCase().includes(q.toLowerCase()) || (u.address ?? "").toLowerCase().includes(q.toLowerCase()))
    : users;

  return (
    <div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email or wallet address…"
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded px-3 py-2 focus:outline-none focus:border-primary mb-4" />
      <div className="panel border border-zinc-800 rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-zinc-900/60 text-xs font-display tracking-widest text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2">EMAIL</th>
              <th className="text-left px-4 py-2">WALLET</th>
              <th className="text-left px-4 py-2">XP</th>
              <th className="text-left px-4 py-2">LEVEL</th>
              <th className="text-left px-4 py-2">STREAK</th>
              <th className="text-left px-4 py-2">JOINED</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t border-zinc-800 hover:bg-zinc-900/40">
                <td className="px-4 py-3">{u.email ?? <span className="text-muted-foreground">—</span>}</td>
                <td className="px-4 py-3 font-display text-xs text-muted-foreground">{u.address ?? "—"}</td>
                <td className="px-4 py-3 text-neon">{u.xp.toLocaleString()}</td>
                <td className="px-4 py-3">LVL {u.level}</td>
                <td className="px-4 py-3">{u.streak}d</td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No matches.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Tab C: Email ---------- */

function EmailTab() {
  return (
    <div className="panel border border-zinc-800 rounded-lg p-6 max-w-2xl">
      <p className="font-display text-xs tracking-widest text-accent">// GMAIL DISPATCHER</p>
      <h3 className="text-xl font-semibold mt-2">Order Confirmation Email</h3>
      <p className="text-sm text-muted-foreground mt-2">
        When you click <span className="text-success">Confirm</span> on any pending order in the Orders tab,
        a stylized confirmation email is sent automatically via Gmail SMTP to the buyer's address.
      </p>
      <div className="mt-6 space-y-3 text-sm">
        <Row k="SMTP host" v="smtp.gmail.com" />
        <Row k="Port" v="465 (SSL)" />
        <Row k="From" v="$SMTP_USER (configured Gmail address)" />
        <Row k="Auth" v="Google App Password ($SMTP_PASS)" />
      </div>
      <div className="mt-6 p-4 border border-warning/40 rounded text-xs text-warning/90">
        ⚠ Make sure 2-Step Verification is enabled on your Google account, then generate an App Password at
        myaccount.google.com/apppasswords. Use that 16-char password as <code className="text-warning">SMTP_PASS</code>.
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-zinc-800 pb-2">
      <span className="font-display text-xs text-muted-foreground tracking-widest uppercase">{k}</span>
      <span className="text-foreground font-mono text-xs">{v}</span>
    </div>
  );
}

/* ---------- Tab D: Create ---------- */

function CreateTab() {
  const addProduct = useServerFn(createProduct);
  const addQuest = useServerFn(createQuest);

  // Product form
  const [pName, setPName] = useState("");
  const [pType, setPType] = useState<"x-premium" | "topup" | "marketplace">("x-premium");
  const [pPrice, setPPrice] = useState("");
  const [pDesc, setPDesc] = useState("");

  // Quest form
  const [qId, setQId] = useState("");
  const [qTitle, setQTitle] = useState("");
  const [qMax, setQMax] = useState("1");
  const [qXp, setQXp] = useState("100");

  async function submitProduct(e: React.FormEvent) {
    e.preventDefault();
    try {
      await addProduct({ data: { name: pName, type: pType, price: Number(pPrice), description: pDesc } });
      toast.success("Product added");
      setPName(""); setPPrice(""); setPDesc("");
    } catch (e: unknown) { toast.error((e as Error).message); }
  }

  async function submitQuest(e: React.FormEvent) {
    e.preventDefault();
    try {
      await addQuest({ data: { quest_id: qId, title: qTitle, max_progress: Number(qMax), xp_reward: Number(qXp) } });
      toast.success("Quest added");
      setQId(""); setQTitle(""); setQMax("1"); setQXp("100");
    } catch (e: unknown) { toast.error((e as Error).message); }
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <form onSubmit={submitProduct} className="panel border border-zinc-800 rounded-lg p-6 space-y-4">
        <h3 className="font-display text-xs tracking-widest text-accent">// ADD PRODUCT</h3>
        <FormInput label="Name" value={pName} onChange={setPName} required />
        <div>
          <label className="block text-xs font-display tracking-widest text-muted-foreground mb-1">TYPE</label>
          <select value={pType} onChange={(e) => setPType(e.target.value as typeof pType)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 focus:outline-none focus:border-primary">
            <option value="x-premium">x-premium</option>
            <option value="topup">topup</option>
            <option value="marketplace">marketplace</option>
          </select>
        </div>
        <FormInput label="Price (USD)" value={pPrice} onChange={setPPrice} required type="number" step="0.01" />
        <FormInput label="Description" value={pDesc} onChange={setPDesc} />
        <button className="w-full py-2.5 rounded bg-primary text-primary-foreground font-medium glow-border">Add product</button>
      </form>

      <form onSubmit={submitQuest} className="panel border border-zinc-800 rounded-lg p-6 space-y-4">
        <h3 className="font-display text-xs tracking-widest text-accent">// ADD QUEST</h3>
        <FormInput label="Quest ID" value={qId} onChange={setQId} required placeholder="daily_login" />
        <FormInput label="Title" value={qTitle} onChange={setQTitle} required />
        <FormInput label="Max progress" value={qMax} onChange={setQMax} type="number" required />
        <FormInput label="XP reward" value={qXp} onChange={setQXp} type="number" required />
        <button className="w-full py-2.5 rounded bg-primary text-primary-foreground font-medium glow-border">Add quest</button>
      </form>
    </div>
  );
}

function FormInput({ label, value, onChange, ...rest }: { label: string; value: string; onChange: (v: string) => void; [k: string]: unknown }) {
  return (
    <div>
      <label className="block text-xs font-display tracking-widest text-muted-foreground mb-1">{label.toUpperCase()}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 focus:outline-none focus:border-primary"
        {...(rest as React.InputHTMLAttributes<HTMLInputElement>)} />
    </div>
  );
}
