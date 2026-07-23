import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { toast } from "sonner";
import {
  LayoutDashboard, Wallet as WalletIcon, Target, Gift, Store, Gamepad2,
  Twitter, Wrench, Rocket, Trophy, Bell, ChevronLeft, Settings, ShoppingBag,
  LogOut, ShieldCheck, Copy, Check,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/wallet", label: "Wallet", Icon: WalletIcon },
  { to: "/quests", label: "Quests", Icon: Target },
  { to: "/rewards", label: "RewardHub", Icon: Gift },
  { to: "/marketplace", label: "Marketplace", Icon: Store },
  { to: "/topup", label: "Game Top-Up", Icon: Gamepad2 },
  { to: "/x-premium", label: "X Premium", Icon: Twitter },
  { to: "/tools", label: "ArcTools", Icon: Wrench },
  { to: "/memes", label: "MemeVault", Icon: Rocket },
  { to: "/leaderboard", label: "Leaderboard", Icon: Trophy },
  { to: "/orders", label: "Orders", Icon: ShoppingBag },
] as const;

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  const [isAdmin, setIsAdmin] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { address, connect, connecting, disconnect } = useWallet();

  useEffect(() => {
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data || user.email === "anishkumargupta031@gmail.com"));
  }, [user.id, user.email]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  async function copyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast?.error?.("Copy failed");
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className={`${collapsed ? "w-16" : "w-60"} shrink-0 border-r border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 h-screen flex flex-col transition-all`}>
        <div className="h-14 px-4 flex items-center justify-between border-b border-zinc-800">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm">A</div>
            {!collapsed && <span className="font-display tracking-widest text-neon text-sm">ARC NOVA</span>}
          </Link>
          <button onClick={() => setCollapsed((c) => !c)} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
          {NAV.map(({ to, label, Icon }) => (
            <Link key={to} to={to}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-zinc-900 transition-colors"
              activeProps={{ className: "flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-gradient-to-r from-primary/20 to-accent/10 text-neon border border-primary/30" }}>
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-accent hover:bg-zinc-900 transition-colors"
              activeProps={{ className: "flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-accent/10 text-accent border border-accent/30" }}>
              <ShieldCheck className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Admin</span>}
            </Link>
          )}
        </nav>
        <div className="p-2 border-t border-zinc-800 space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-zinc-900 transition-colors">
            <Settings className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Settings</span>}
          </button>
          <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-zinc-900 transition-colors">
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 border-b border-zinc-800 bg-zinc-950/70 backdrop-blur sticky top-0 z-10 flex items-center justify-end gap-3 px-6">
          <button className="text-muted-foreground hover:text-foreground" aria-label="notifications">
            <Bell className="w-5 h-5" />
          </button>
          <span className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-800 text-xs font-display">
            <span className="w-1.5 h-1.5 rounded-full bg-success" /> Arc Testnet
          </span>
          {address ? (
            <span className="px-3 py-1.5 rounded-lg border border-primary/40 text-xs font-display text-neon glow-border">
              {address.slice(0, 6)}…{address.slice(-4)}
            </span>
          ) : (
            <button onClick={connect} disabled={connecting}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-primary to-accent text-white text-sm font-medium disabled:opacity-50">
              {connecting ? "Connecting…" : "Connect Wallet"}
            </button>
          )}
        </header>
        <Outlet />
      </div>
    </div>
  );
}
