import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "./data";

type AuthCtx = { user: User | null; profile: Profile | null; ready: boolean };
const Ctx = createContext<AuthCtx>({ user: null, profile: null, ready: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });
    supabase.auth.getSession().then(({ data: s }) => {
      setUser(s.session?.user ?? null);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const { data: profile } = useQuery({
    queryKey: ["me", user?.id, "profile"],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return (data as Profile) ?? null;
    },
  });

  return <Ctx.Provider value={{ user, profile: user ? (profile ?? null) : null, ready }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
