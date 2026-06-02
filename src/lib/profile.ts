/**
 * Profile healing: ensures a row in public.users exists for the current session,
 * matched by email OR address. If none exists, inserts a fresh profile.
 */
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  auth_user_id: string;
  address: string | null;
  email: string | null;
  username: string | null;
  xp: number;
  level: number;
  streak: number;
  invites: number;
};

export async function healProfile(user: User, walletAddress?: string | null): Promise<Profile> {
  const email = user.email ?? null;
  const address = walletAddress ?? null;

  // Flexible OR lookup: email OR address OR auth_user_id
  const orParts: string[] = [`auth_user_id.eq.${user.id}`];
  if (email) orParts.push(`email.eq.${email}`);
  if (address) orParts.push(`address.eq.${address}`);

  const { data: existing } = await supabase
    .from("users")
    .select("*")
    .or(orParts.join(","))
    .limit(1)
    .maybeSingle();

  if (existing) {
    // backfill auth_user_id / address if missing
    const patch: {
      auth_user_id?: string;
      email?: string;
      address?: string;
    } = {};
    if (!existing.auth_user_id) patch.auth_user_id = user.id;
    if (!existing.email && email) patch.email = email;
    if (!existing.address && address) patch.address = address;
    if (Object.keys(patch).length) {
      const { data: updated } = await supabase
        .from("users").update(patch).eq("id", existing.id).select("*").single();
      return (updated ?? existing) as Profile;
    }
    return existing as Profile;
  }

  // No row → provision a fresh one
  const { data: created, error } = await supabase
    .from("users")
    .insert({
      auth_user_id: user.id,
      email,
      address,
      username: email ? email.split("@")[0] : null,
      xp: 0,
      level: 1,
      streak: 0,
    })
    .select("*")
    .single();

  if (error) throw error;
  return created as Profile;
}
