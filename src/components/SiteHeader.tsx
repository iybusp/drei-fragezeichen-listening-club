import { Link, useNavigate } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

export function SiteHeader() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const navCls = "text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-q-white";
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-header/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link to="/">
          <Logo />
        </Link>
        <nav className="ml-auto flex items-center gap-5">
          <Link to="/folgen" className={navCls} activeProps={{ className: "text-q-white" }}>
            Folgen
          </Link>
          {user && profile ? (
            <DropdownMenu>
              <DropdownMenuTrigger className={`${navCls} flex items-center gap-1`}>
                <span className="flex size-6 items-center justify-center rounded-full bg-secondary text-[10px] text-q-white">
                  {(profile.display_name ?? profile.username).slice(0, 1).toUpperCase()}
                </span>
                {profile.display_name ?? profile.username}
                <ChevronDown className="size-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate({ to: "/u/$username", params: { username: profile.username } })}>
                  Profil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/einstellungen" })}>Einstellungen</DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate({ to: "/" });
                  }}
                >
                  Abmelden
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Anmelden</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
