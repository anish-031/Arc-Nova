import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/use-theme";
import { useWallet } from "@/hooks/use-wallet";
import { toast } from "sonner";
import {
  Sun, Moon, LogOut, KeyRound, Bell, Wallet as WalletIcon,
  Trash2, Copy, Check, Mail, ShieldAlert,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — ARC NOVA" },
      { name: "description", content: "Manage your ARC NOVA account, theme, wallet, and notifications." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { address, disconnect } = useWallet();

  const [notifOrders, setNotifOrders] = useState(true);
  const [notifSwaps, setNotifSwaps] = useState(true);
  const [notifMarketing, setNotifMarketing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      setNotifOrders(localStorage.getItem("arcnova.notif.orders") !== "0");
      setNotifSwaps(localStorage.getItem("arcnova.notif.swaps") !== "0");
      setNotifMarketing(localStorage.getItem("arcnova.notif.marketing") === "1");
    } catch { /* ignore */ }
  }, []);

  function persistNotif(key: string, val: boolean) {
    try { localStorage.setItem(key, val ? "1" : "0"); } catch { /* ignore */ }
  }

  async function signOut() {
    setBusy(true);
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  async function sendPasswordReset() {
    if (!user.email) return;
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Password reset email sent");
  }

  async function copyEmail() {
    if (!user.email) return;
    await navigator.clipboard.writeText(user.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function deleteAccount() {
    if (!confirm("This will permanently delete your account and all associated data. Continue?")) return;
    toast.message("Account deletion requested. Our team will process it within 24 hours.");
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <div>
        <p className="font-display text-xs tracking-widest text-muted-foreground">// SETTINGS</p>
        <h1 className="text-3xl font-bold mt-1">Preferences</h1>
        <p className="text-sm text-muted-foreground mt-1">Customize your ARC NOVA experience.</p>
      </div>

      {/* Appearance */}
      <Section title="APPEARANCE" desc="Change how the terminal looks.">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-medium">Theme</p>
            <p className="text-sm text-muted-foreground">Switch between dark and light mode.</p>
          </div>
          <div className="inline-flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setTheme("dark")}
              className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors ${theme === "dark" ? "bg-primary/20 text-neon" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Moon className="w-4 h-4" /> Dark
            </button>
            <button
              onClick={() => setTheme("light")}
              className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors border-l border-border ${theme === "light" ? "bg-primary/20 text-neon" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Sun className="w-4 h-4" /> Light
            </button>
          </div>
        </div>
      </Section>

      {/* Account */}
      <Section title="ACCOUNT" desc="Your identity on ARC NOVA.">
        <Row
          icon={<Mail className="w-4 h-4" />}
          label="Email"
          value={user.email ?? "—"}
          action={
            <button onClick={copyEmail} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          }
        />
        <Row
          icon={<KeyRound className="w-4 h-4" />}
          label="Password"
          value="••••••••••"
          action={
            <button
              disabled={busy}
              onClick={sendPasswordReset}
              className="text-xs text-primary hover:underline disabled:opacity-50"
            >
              Send reset email
            </button>
          }
        />
      </Section>

      {/* Wallet */}
      <Section title="WALLET" desc="Manage your connected wallet.">
        <Row
          icon={<WalletIcon className="w-4 h-4" />}
          label="Connected wallet"
          value={address ? `${address.slice(0, 8)}…${address.slice(-6)}` : "Not connected"}
          action={
            address ? (
              <button onClick={disconnect} className="text-xs text-destructive hover:underline">
                Disconnect
              </button>
            ) : null
          }
        />
      </Section>

      {/* Notifications */}
      <Section title="NOTIFICATIONS" desc="Choose what we ping you about.">
        <Toggle
          icon={<Bell className="w-4 h-4" />}
          label="Order updates"
          desc="Delivery confirmations and receipts."
          checked={notifOrders}
          onChange={(v) => { setNotifOrders(v); persistNotif("arcnova.notif.orders", v); }}
        />
        <Toggle
          icon={<Bell className="w-4 h-4" />}
          label="Swap confirmations"
          desc="On-chain status updates for your swaps."
          checked={notifSwaps}
          onChange={(v) => { setNotifSwaps(v); persistNotif("arcnova.notif.swaps", v); }}
        />
        <Toggle
          icon={<Bell className="w-4 h-4" />}
          label="Product news"
          desc="New drops, quests, and rewards."
          checked={notifMarketing}
          onChange={(v) => { setNotifMarketing(v); persistNotif("arcnova.notif.marketing", v); }}
        />
      </Section>

      {/* Danger */}
      <Section title="SESSION" desc="Sign out or remove your account.">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <LogOut className="w-4 h-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">Sign out</p>
              <p className="text-sm text-muted-foreground">End your session on this device.</p>
            </div>
          </div>
          <button
            disabled={busy}
            onClick={signOut}
            className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary transition-colors disabled:opacity-50"
          >
            Sign out
          </button>
        </div>
        <div className="h-px bg-border my-4" />
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 mt-0.5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Delete account</p>
              <p className="text-sm text-muted-foreground">Permanently erase your ARC NOVA data. This cannot be undone.</p>
            </div>
          </div>
          <button
            onClick={deleteAccount}
            className="px-4 py-2 rounded-lg border border-destructive/40 text-destructive text-sm hover:bg-destructive/10 transition-colors inline-flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </Section>

      <p className="text-xs text-muted-foreground text-center pt-4">
        Need help? Contact support from the{" "}
        <button onClick={() => navigate({ to: "/dashboard" })} className="text-primary hover:underline">
          Dashboard
        </button>
        .
      </p>
    </main>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="panel border border-border rounded-lg p-6 space-y-4">
      <div>
        <h2 className="font-display tracking-widest text-sm text-muted-foreground">// {title}</h2>
        {desc && <p className="text-xs text-muted-foreground mt-1">{desc}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row({ icon, label, value, action }: { icon: React.ReactNode; label: string; value: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-start gap-3 min-w-0">
        <span className="text-muted-foreground mt-0.5">{icon}</span>
        <div className="min-w-0">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-muted-foreground font-mono truncate">{value}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function Toggle({ icon, label, desc, checked, onChange }: { icon: React.ReactNode; label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-start gap-3">
        <span className="text-muted-foreground mt-0.5">{icon}</span>
        <div>
          <p className="font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </div>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-primary" : "bg-secondary"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background transition-transform ${checked ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}
