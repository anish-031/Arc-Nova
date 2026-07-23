import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateSchema = z.object({
  wallet_address: z.string().nullable().optional(),
  token_in: z.string(),
  token_out: z.string(),
  amount_in: z.number(),
  amount_out: z.number().nullable().optional(),
  min_received: z.number().nullable().optional(),
  rate: z.number().nullable().optional(),
  gas_gwei: z.number().nullable().optional(),
});

export const createSwapAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => CreateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("swap_attempts")
      .insert({ ...data, user_id: context.userId, status: "pending" })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

const UpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "broadcast", "success", "failed"]).optional(),
  tx_hash: z.string().nullable().optional(),
  explorer_url: z.string().nullable().optional(),
  amount_out: z.number().nullable().optional(),
  error: z.string().nullable().optional(),
});

export const updateSwapAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => UpdateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase
      .from("swap_attempts")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listSwapAttempts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("swap_attempts")
      .select("id,token_in,token_out,amount_in,amount_out,min_received,tx_hash,explorer_url,status,error,gas_gwei,created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
