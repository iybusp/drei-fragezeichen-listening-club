import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { episodesQuery, fullTitle } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EpisodeCover } from "@/components/EpisodeCover";

export const Route = createFileRoute("/einstellungen")({
  head: () => ({
    meta: [
      { title: "Einstellungen – Hörboxd" },
      { name: "description", content: "Bearbeite dein Profil und deine Top 4." },
      { property: "og:title", content: "Einstellungen – Hörboxd" },
      { property: "og:description", content: "Profil und Top 4 bearbeiten." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { user, profile, ready } = useAuth();
  const qc = useQueryClient();
  const { data: episodes = [] } = useQuery(episodesQuery());
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [top, setTop] = useState<(number | null)[]>([null, null, null, null]);

  useEffect(() => {
    if (!profile) return;
    setName(profile.display_name ?? "");
    setBio(profile.bio ?? "");
    supabase.from("favorites").select("position, episode_number").eq("user_id", profile.id).then(({ data }) => {
      const t: (number | null)[] = [null, null, null, null];
      (data ?? []).forEach((f) => (t[f.position - 1] = f.episode_number));
      setTop(t);
    });
  }, [profile]);

  if (!ready) return null;
  if (!user || !profile)
    return (
      <p className="py-20 text-center text-sm">
        <Link to="/auth" className="text-q-blue hover:underline">Melde dich an</Link>, um dein Profil zu bearbeiten.
      </p>
    );

  async function save() {
    const uid = user!.id;
    const { error } = await supabase.from("profiles").update({ display_name: name || null, bio: bio || null }).eq("id", uid);
    await supabase.from("favorites").delete().eq("user_id", uid);
    const rows = top.map((n, i) => (n ? { user_id: uid, position: i + 1, episode_number: n } : null)).filter((r) => r !== null);
    const uniq = rows.filter((r, i) => rows.findIndex((x) => x.episode_number === r.episode_number) === i);
    const fav = uniq.length ? await supabase.from("favorites").insert(uniq) : { error: null };
    if (error || fav.error) toast.error("Speichern fehlgeschlagen");
    else toast.success("Gespeichert");
    qc.invalidateQueries();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <h1 className="text-3xl font-bold">Einstellungen</h1>
      <div className="space-y-3">
        <div className="space-y-1"><Label>Anzeigename</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-1"><Label>Über mich</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} /></div>
      </div>
      <div>
        <h2 className="section-title">Top 4 Lieblingsfolgen</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {top.map((n, i) => {
            const ep = episodes.find((e) => e.number === n);
            return (
              <div key={i} className="space-y-2">
                {ep ? <EpisodeCover episode={ep} size={300} link={false} /> : <div className="aspect-square rounded-md border border-dashed border-border" />}
                <Select value={n ? String(n) : "none"} onValueChange={(v) => setTop(top.map((x, j) => (j === i ? (v === "none" ? null : Number(v)) : x)))}>
                  <SelectTrigger><SelectValue placeholder="Folge wählen" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">– leer –</SelectItem>
                    {episodes.map((e) => <SelectItem key={e.number} value={String(e.number)}>{e.number} · {fullTitle(e)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
      </div>
      <Button onClick={save}>Speichern</Button>
    </div>
  );
}
