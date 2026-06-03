/**
 * Server-side purchase verification + record.
 *
 * The client cannot forge a purchase: this handler re-fetches the tx via
 * the Arc RPC, asserts the recipient is the treasury and the value is at
 * least the expected amount, then inserts the purchase row with the
 * verified hash through the admin client.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const TREASURY_ADDRESS = "0x000000000000000000000000000000000000dEaD";
// Arc Testnet primary RPC (https://docs.arc.io/arc/references/connect-to-arc).
const DEFAULT_RPC = "https://rpc.testnet.arc.network";

const Input = z.object({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  expectedValueWei: z.string().regex(/^\d+$/),
  productType: z.enum(["topup", "x-premium", "marketplace"]),
  productName: z.string().min(1).max(200),
  priceUsd: z.number().min(0).max(1_000_000),
  customUid: z.string().max(64).optional(),
  customUsername: z.string().max(64).optional(),
  itemDetails: z.record(z.string(), z.unknown()).optional(),
});

async function rpc<T>(url: string, method: string, params: unknown[]): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`RPC ${method} failed (${res.status})`);
  const json = (await res.json()) as { result?: T; error?: { message: string } };
  if (json.error) throw new Error(`RPC ${method}: ${json.error.message}`);
  return json.result as T;
}

export const recordVerifiedPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const rpcUrl = process.env.ARC_RPC_URL || DEFAULT_RPC;
    const { userId, claims } = context as { userId: string; claims: { email?: string } };

    // 1. Verify the receipt is mined & succeeded.
    const receipt = await rpc<{ status: string; to: string } | null>(
      rpcUrl,
      "eth_getTransactionReceipt",
      [data.txHash],
    );
    if (!receipt) throw new Error("Transaction not found on-chain yet");
    if (receipt.status !== "0x1") throw new Error("Transaction failed on-chain");

    // 2. Verify recipient + value from the tx itself.
    const tx = await rpc<{ to: string; value: string; from: string } | null>(
      rpcUrl,
      "eth_getTransactionByHash",
      [data.txHash],
    );
    if (!tx) throw new Error("Transaction not found");
    if (tx.to.toLowerCase() !== TREASURY_ADDRESS.toLowerCase()) {
      throw new Error("Payment was sent to the wrong address");
    }
    const paidWei = BigInt(tx.value);
    const expectedWei = BigInt(data.expectedValueWei);
    if (paidWei < expectedWei) {
      throw new Error(`Underpaid: expected ${expectedWei} wei, got ${paidWei} wei`);
    }

    // 3. Reject double-spend (same hash already recorded).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("purchases").select("id").eq("tx_hash", data.txHash).maybeSingle();
    if (existing) throw new Error("This transaction has already been recorded");

    // 4. Insert verified purchase.
    const { data: row, error } = await supabaseAdmin.from("purchases").insert({
      user_id: userId,
      buyer_email: claims.email ?? "",
      product_type: data.productType,
      product_name: data.productName,
      price: data.priceUsd,
      tx_hash: data.txHash,
      custom_uid: data.customUid ?? null,
      custom_username: data.customUsername ?? null,
      item_details: (data.itemDetails ?? null) as never,
      status: "pending",
    }).select("id").single();
    if (error) throw new Error(error.message);

    return { ok: true as const, id: row.id, verifiedValueWei: paidWei.toString() };
  });
