import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — ARC NOVA" },
      { name: "description", content: "Set a new password for your ARC NOVA account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase places tokens in the URL hash; the client auto-consumes them
    // and emits PASSWORD_RECOVERY. We just wait for a session to exist.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password must be at least 6 characters.");
    if (password !== confirm) return toast.error("Passwords do not match.");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. Signing you in…");
      navigate({ to: "/dashboard", replace: true });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 scanline">
      <div className="w-full max-w-md panel border border-zinc-800 rounded-lg p-8">
        <Link to="/" className="font-display tracking-widest text-neon text-sm">ARC NOVA</Link>
        <h1 className="mt-4 text-2xl font-bold">Reset Password</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {ready ? "Enter your new password below." : "Validating reset link…"}
        </p>

        {ready && (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-display tracking-widest text-muted-foreground mb-1">NEW PASSWORD</label>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 focus:outline-none focus:border-primary transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-display tracking-widest text-muted-foreground mb-1">CONFIRM PASSWORD</label>
              <input type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 focus:outline-none focus:border-primary transition-colors" />
            </div>
            <button disabled={loading} className="w-full py-2.5 rounded bg-primary text-primary-foreground font-medium glow-border disabled:opacity-50">
              {loading ? "..." : "Update password"}
            </button>
          </form>
        )}

        {!ready && (
          <p className="mt-6 text-xs text-muted-foreground border border-zinc-800 rounded p-3 bg-zinc-900/50">
            If nothing happens, your reset link may have expired. Request a new one from the sign in page.
          </p>
        )}

        <div className="mt-4 text-sm">
          <Link to="/auth" className="text-muted-foreground hover:text-neon transition-colors">← Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
