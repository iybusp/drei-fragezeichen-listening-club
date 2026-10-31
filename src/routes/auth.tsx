import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import "@lovable.dev/cloud-auth-js/styles.css";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Anmelden – Hörboxd" },
      { name: "description", content: "Melde dich bei Hörboxd an oder erstelle ein Konto." },
      { property: "og:title", content: "Anmelden – Hörboxd" },
      { property: "og:description", content: "Werde Teil der Die drei ??? Community." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "up") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin, data: { username, display_name: username } },
      });
      if (error) toast.error(error.message);
      else setSent(true);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error("Anmeldung fehlgeschlagen. Prüfe E-Mail und Passwort.");
    }
    setBusy(false);
  }

  async function oauth(p: "google" | "lovable") {
    const r = await lovable.auth.signInWithOAuth(p, { redirect_uri: window.location.origin });
    if (r.error) toast.error("Anmeldung fehlgeschlagen");
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-4 py-16">
      <Logo />
      <div className="mt-8 w-full rounded-lg bg-card p-6">
        {sent ? (
          <p className="text-center text-sm">Fast geschafft! Bestätige deine E-Mail über den Link, den wir dir geschickt haben.</p>
        ) : (
          <>
            <h1 className="mb-4 text-xl font-bold">{mode === "in" ? "Anmelden" : "Konto erstellen"}</h1>
            <form onSubmit={submit} className="space-y-3">
              {mode === "up" && (
                <div className="space-y-1">
                  <Label htmlFor="username">Benutzername</Label>
                  <Input id="username" required pattern="[a-zA-Z0-9_]{3,20}" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="email">E-Mail</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Passwort</Label>
                <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {mode === "in" ? "Anmelden" : "Registrieren"}
              </Button>
            </form>
            <div className="my-4 text-center text-xs text-muted-foreground">oder</div>
            <div className="space-y-2">
              <Button variant="secondary" className="w-full" onClick={() => oauth("google")}>Weiter mit Google</Button>
              <button type="button" className="lovable-auth-button w-full" onClick={() => oauth("lovable")}>
                Continue with Lovable
              </button>
            </div>
            <button className="mt-4 w-full text-center text-xs text-q-blue hover:underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
              {mode === "in" ? "Noch kein Konto? Registrieren" : "Schon ein Konto? Anmelden"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
