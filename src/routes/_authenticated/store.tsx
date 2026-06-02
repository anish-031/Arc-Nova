import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/store")({
  head: () => ({ meta: [{ title: "Store — ARC NOVA" }] }),
  component: StorePage,
});

type Product = { id: string; name: string; type: string; price: number; description: string | null };

function StorePage() {
  const { user } = Route.useRouteContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);

  useEffect(() => {
    supabase.from("products").select("*").eq("active", true).order("created_at", { ascending: false })
      .then(({ data }) => setProducts((data ?? []) as Product[]));
  }, []);

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold">Store</h1>
      <p className="text-muted-foreground mt-1">Pick an item. Orders default to <span className="text-warning">pending</span> until admin confirmation.</p>

      <div className="mt-8 grid md:grid-cols-3 gap-4">
        {products.map((p) => (
          <div key={p.id} className="panel border border-zinc-800 rounded-lg p-5 hover:border-primary transition-colors">
            <p className="font-display text-[10px] tracking-widest text-muted-foreground">// {p.type.toUpperCase()}</p>
            <h3 className="text-lg font-semibold mt-1 text-neon">{p.name}</h3>
            <p className="text-sm text-muted-foreground mt-2 min-h-[2.5rem]">{p.description}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xl font-bold">${Number(p.price).toFixed(2)}</span>
              <button onClick={() => setSelected(p)}
                className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm glow-border">Buy</button>
            </div>
          </div>
        ))}
        {products.length === 0 && <p className="text-muted-foreground">No products listed yet.</p>}
      </div>

      {selected && <CheckoutModal product={selected} user={user} onClose={() => setSelected(null)} />}
    </main>
  );
}

function CheckoutModal({ product, user, onClose }: { product: Product; user: { id: string; email?: string }; onClose: () => void }) {
  const [customUsername, setCustomUsername] = useState("");
  const [customUid, setCustomUid] = useState("");
  const [txHash, setTxHash] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.from("purchases").insert({
        user_id: user.id,
        buyer_email: user.email ?? "",
        product_id: product.id,
        product_type: product.type as "x-premium" | "topup" | "marketplace",
        product_name: product.name,
        price: product.price,
        tx_hash: txHash || null,
        custom_username: product.type === "x-premium" ? customUsername : null,
        custom_uid: product.type === "topup" ? customUid : null,
        item_details: product.type === "marketplace" ? { name: product.name } : null,
        status: "pending",
      });
      if (error) throw error;
      toast.success("Order placed — pending admin confirmation");
      onClose();
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message ?? "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit}
        className="w-full max-w-md panel border border-zinc-800 rounded-lg p-6 space-y-4">
        <h3 className="text-xl font-bold text-neon">{product.name}</h3>
        <p className="text-sm text-muted-foreground">${Number(product.price).toFixed(2)} · {product.type}</p>

        {product.type === "x-premium" && (
          <Field label="X Username (required)" value={customUsername} onChange={setCustomUsername} required placeholder="@yourhandle" />
        )}
        {product.type === "topup" && (
          <Field label="In-game UID (required)" value={customUid} onChange={setCustomUid} required placeholder="123456789" />
        )}
        <Field label="Transaction Hash (optional)" value={txHash} onChange={setTxHash} placeholder="0x…" />

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded border border-zinc-800 hover:border-zinc-600">Cancel</button>
          <button disabled={submitting} className="flex-1 py-2 rounded bg-primary text-primary-foreground font-medium glow-border disabled:opacity-50">
            {submitting ? "..." : "Place Order"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, required, placeholder }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-display tracking-widest text-muted-foreground mb-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder}
        className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 focus:outline-none focus:border-primary" />
    </div>
  );
}
