/**
 * Admin server functions. All require requireSupabaseAuth + admin role
 * OR master email override (mastergupta299@gmail.com).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const MASTER_EMAIL = "mastergupta299@gmail.com";

async function assertAdmin(context: { supabase: any; userId: string; claims: { email?: string } }) {
  const email = context.claims.email;
  if (email === MASTER_EMAIL) return true;
  const { data } = await context.supabase
    .from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
  return true;
}

export const confirmOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ purchaseId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await supabaseAdmin
      .from("purchases").update({ status: "success", confirmed_at: new Date().toISOString() })
      .eq("id", data.purchaseId).select("*").single();
    if (error) throw new Error(error.message);

    // Send confirmation email
    try {
      const { sendOrderConfirmationEmail } = await import("./email.server");
      await sendOrderConfirmationEmail({
        to: order.buyer_email,
        productName: order.product_name,
        productType: order.product_type,
        price: Number(order.price),
        txHash: order.tx_hash,
      });
    } catch (e) {
      console.error("[confirmOrder] email send failed:", e);
      // Don't fail the confirm — return a flag
      return { ok: true, emailed: false, error: (e as Error).message };
    }
    return { ok: true, emailed: true };
  });

export const createProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    name: z.string().min(1).max(200),
    type: z.enum(["x-premium", "topup", "marketplace"]),
    price: z.number().min(0),
    description: z.string().max(2000).optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("products").insert({
      name: data.name, type: data.type, price: data.price, description: data.description ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createQuest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    quest_id: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
    title: z.string().min(1).max(200),
    max_progress: z.number().int().min(1).max(100000),
    xp_reward: z.number().int().min(0).max(1000000),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("quests").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
