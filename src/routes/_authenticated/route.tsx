import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data || user.email === "mastergupta299@gmail.com"));
  }, [user.id, user.email]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen scanline">
      <header className="border-b border-zinc-800 bg-zinc-950/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="font-display tracking-widest text-neon">ARC NOVA</Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/dashboard" className="hover:text-neon transition-colors" activeProps={{ className: "text-neon" }}>Dashboard</Link>
            <Link to="/store" className="hover:text-neon transition-colors" activeProps={{ className: "text-neon" }}>Store</Link>
            <Link to="/topup" className="hover:text-neon transition-colors" activeProps={{ className: "text-neon" }}>Top-Up</Link>
            <Link to="/orders" className="hover:text-neon transition-colors" activeProps={{ className: "text-neon" }}>Orders</Link>
            {isAdmin && <Link to="/admin" className="text-accent hover:opacity-80" activeProps={{ className: "underline" }}>Admin</Link>}
            <button onClick={signOut} className="text-muted-foreground hover:text-foreground">Sign out</button>
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
