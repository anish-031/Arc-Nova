import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — ARC NOVA" }, { name: "description", content: "Sign in or create your ARC NOVA account." }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/dashboard", replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast.success("Account created. Check your email to verify before signing in.");
        setCooldown(30);
        setMode("signin");
      } else if (mode === "forgot") {
        if (cooldown > 0) return;
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset link sent — check your inbox.");
        setCooldown(30);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          const msg = (error.message || "").toLowerCase();
          if (msg.includes("email") && msg.includes("confirm")) {
            toast.error("Please confirm your email first — check your inbox for the verification link.");
          } else if (msg.includes("invalid")) {
            toast.error("Invalid email or password. If you just signed up, confirm your email first.");
          } else {
            throw error;
          }
          return;
        }
        toast.success("Welcome back, operator.");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function resendConfirmation() {
    if (!email) { toast.error("Enter your email first"); return; }
    if (cooldown > 0) return;
    const { error } = await supabase.auth.resend({
      type: "signup", email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Confirmation email resent — check your inbox.");
      setCooldown(30);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 scanline">
      <div className="w-full max-w-md panel border border-zinc-800 rounded-lg p-8">
        <Link to="/" className="font-display tracking-widest text-neon text-sm">ARC NOVA</Link>
        <h1 className="mt-4 text-2xl font-bold">
          {mode === "signin" ? "Access Terminal" : mode === "signup" ? "Create Identity" : "Reset Password"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {mode === "forgot"
            ? "Enter your email — we'll send a reset link."
            : "Sign in with email. Wallet connect available inside the app."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-display tracking-widest text-muted-foreground mb-1">EMAIL</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 focus:outline-none focus:border-primary transition-colors" />
          </div>
          {mode !== "forgot" && (
            <div>
              <label className="block text-xs font-display tracking-widest text-muted-foreground mb-1">PASSWORD</label>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 focus:outline-none focus:border-primary transition-colors" />
            </div>
          )}
          <button disabled={loading || (mode === "forgot" && cooldown > 0)} className="w-full py-2.5 rounded bg-primary text-primary-foreground font-medium glow-border disabled:opacity-50">
            {loading ? "..." : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : cooldown > 0 ? `Resend in ${cooldown}s` : "Send reset link"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm flex-wrap gap-2">
          <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-muted-foreground hover:text-neon transition-colors">
            {mode === "signin" ? "No account? Create one →" : mode === "signup" ? "Have an account? Sign in →" : "← Back to sign in"}
          </button>
          {mode === "signin" && (
            <button type="button" onClick={() => setMode("forgot")}
              className="text-muted-foreground hover:text-neon transition-colors">
              Forgot password?
            </button>
          )}
          {mode === "signup" && (
            <button onClick={resendConfirmation} type="button"
              disabled={cooldown > 0}
              className="text-muted-foreground hover:text-neon transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend confirmation"}
            </button>
          )}
        </div>

        {mode === "signup" && (
          <p className="mt-4 text-xs text-muted-foreground border border-zinc-800 rounded p-3 bg-zinc-900/50">
            After creating your account, we'll send a confirmation link to your email. Click it to activate your identity before signing in.
          </p>
        )}
        {mode === "forgot" && (
          <p className="mt-4 text-xs text-muted-foreground border border-zinc-800 rounded p-3 bg-zinc-900/50">
            We'll email a secure link to reset your password. The link opens the reset page where you set a new one.
          </p>
        )}
      </div>
    </div>
  );
}
