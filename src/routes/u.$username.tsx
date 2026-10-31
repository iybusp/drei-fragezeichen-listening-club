import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Heart, RotateCcw } from "lucide-react";
import { profileQuery, fullTitle } from "@/lib/data";
import { EpisodeCover } from "@/components/EpisodeCover";
import { ReviewCard } from "@/components/ReviewCard";
import { StarsDisplay } from "@/components/Stars";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/u/$username")({
  loader: async ({ context, params }) => {
    const d = await context.queryClient.ensureQueryData(profileQuery(params.username));
    if (!d) throw notFound();
    return { name: d.profile.display_name ?? d.profile.username, count: d.logs.length };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.name} – Hörboxd` },
          { name: "description", content: `${loaderData.name} hat ${loaderData.count} Die drei ??? Folgen eingetragen.` },
          { property: "og:title", content: `${loaderData.name} auf Hörboxd` },
          { property: "og:description", content: `Top 4, Tagebuch und Rezensionen von ${loaderData.name}.` },
        ]
      : [{ title: "Profil nicht gefunden – Hörboxd" }, { name: "robots", content: "noindex" }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { username } = Route.useParams();
  const { data } = useSuspenseQuery(profileQuery(username));
  const { user } = useAuth();
  const qc = useQueryClient();
  if (!data) return null;
  const { profile, logs, favorites, watchlist, followers, following } = data;
  const isMe = user?.id === profile.id;
  const amFollowing = !!user && followers.some((f) => f.follower_id === user.id);
  const thisYear = logs.filter((l) => new Date(l.listened_on).getFullYear() === new Date().getFullYear()).length;
  const uniqueEps = new Set(logs.map((l) => l.episode_number)).size;
  const reviews = logs.filter((l) => l.review);
  const name = profile.display_name ?? profile.username;

  async function toggleFollow() {
    if (!user) return;
    if (amFollowing) await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", profile.id);
    else await supabase.from("follows").insert({ follower_id: user.id, following_id: profile.id });
    qc.invalidateQueries({ queryKey: ["profile", username] });
    qc.invalidateQueries({ queryKey: ["me", user.id] });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="flex flex-wrap items-center gap-6 border-b border-border pb-6">
        <div className="flex size-20 items-center justify-center rounded-full bg-secondary font-display text-3xl font-bold text-q-white">
          {name.slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{name}</h1>
            {isMe ? (
              <Button asChild size="sm" variant="secondary"><Link to="/einstellungen">Profil bearbeiten</Link></Button>
            ) : user ? (
              <Button size="sm" variant={amFollowing ? "secondary" : "default"} onClick={toggleFollow}>
                {amFollowing ? "Entfolgen" : "Folgen"}
              </Button>
            ) : null}
          </div>
          <div className="text-sm text-muted-foreground">@{profile.username}</div>
          {profile.bio && <p className="mt-2 max-w-prose text-sm">{profile.bio}</p>}
        </div>
        <dl className="flex divide-x divide-border text-center">
          {[
            [uniqueEps, "Folgen"],
            [thisYear, "Dieses Jahr"],
            [following.length, "Folgt"],
            [followers.length, "Follower"],
          ].map(([v, l]) => (
            <div key={l as string} className="px-4">
              <dt className="font-display text-xl font-bold text-q-white">{v}</dt>
              <dd className="text-[10px] uppercase tracking-widest text-muted-foreground">{l}</dd>
            </div>
          ))}
        </dl>
      </header>

      <section className="mt-8">
        <h2 className="section-title">Top 4</h2>
        <div className="grid max-w-3xl grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((pos) => {
            const f = favorites.find((x) => x.position === pos);
            return f?.episodes ? (
              <EpisodeCover key={pos} episode={f.episodes} size={400} />
            ) : (
              <div key={pos} className="aspect-square rounded-md border border-dashed border-border" />
            );
          })}
        </div>
        {isMe && favorites.length < 4 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Wähle deine Lieblingsfolgen in den <Link to="/einstellungen" className="text-q-blue hover:underline">Einstellungen</Link>.
          </p>
        )}
      </section>

      <Tabs defaultValue="aktivitaet" className="mt-10">
        <TabsList>
          <TabsTrigger value="aktivitaet">Zuletzt gehört</TabsTrigger>
          <TabsTrigger value="tagebuch">Tagebuch</TabsTrigger>
          <TabsTrigger value="rezensionen">Rezensionen ({reviews.length})</TabsTrigger>
          <TabsTrigger value="merkliste">Merkliste ({watchlist.length})</TabsTrigger>
          <TabsTrigger value="netzwerk">Netzwerk</TabsTrigger>
        </TabsList>

        <TabsContent value="aktivitaet" className="pt-4">
          {logs.length === 0 ? <Empty text="Noch keine Folgen eingetragen." /> : (
            <div className="grid grid-cols-4 gap-3 md:grid-cols-8">
              {logs.slice(0, 16).map((l) => l.episodes && (
                <div key={l.id}>
                  <EpisodeCover episode={l.episodes} size={200} />
                  <div className="mt-1 flex items-center gap-1">
                    <StarsDisplay rating={l.rating} className="[&>svg]:size-2.5" />
                    {l.liked && <Heart className="size-2.5 fill-heart text-heart" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tagebuch" className="pt-4">
          {logs.length === 0 ? <Empty text="Das Tagebuch ist leer." /> : (
            <table className="w-full text-sm">
              <thead className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr className="border-b border-border"><th className="py-2">Datum</th><th>Folge</th><th>Bewertung</th><th className="text-center">Like</th><th className="text-center">Wdh.</th></tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-border/60">
                    <td className="py-2 pr-4 text-muted-foreground">{format(new Date(l.listened_on), "d. MMM yyyy", { locale: de })}</td>
                    <td className="pr-4">
                      {l.episodes && (
                        <Link to="/folge/$nummer" params={{ nummer: String(l.episode_number) }} className="font-semibold text-q-white hover:text-q-blue">
                          {fullTitle(l.episodes)}
                        </Link>
                      )}
                    </td>
                    <td><StarsDisplay rating={l.rating} /></td>
                    <td className="text-center">{l.liked && <Heart className="inline size-3.5 fill-heart text-heart" />}</td>
                    <td className="text-center">{l.is_relisten && <RotateCcw className="inline size-3.5" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TabsContent>

        <TabsContent value="rezensionen" className="pt-2">
          {reviews.length === 0 ? <Empty text="Noch keine Rezensionen." /> : reviews.map((r) => <ReviewCard key={r.id} log={r} />)}
        </TabsContent>

        <TabsContent value="merkliste" className="pt-4">
          {watchlist.length === 0 ? <Empty text="Die Merkliste ist leer." /> : (
            <div className="grid grid-cols-4 gap-3 md:grid-cols-8">
              {watchlist.map((w) => w.episodes && <EpisodeCover key={w.episodes.number} episode={w.episodes} size={200} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="netzwerk" className="grid gap-8 pt-4 md:grid-cols-2">
          {[["Folgt", following.map((f) => f.profiles)], ["Follower", followers.map((f) => f.profiles)]].map(([t, list]) => (
            <div key={t as string}>
              <h3 className="section-title">{t as string}</h3>
              {(list as { username: string; display_name: string | null }[]).length === 0 ? <Empty text="Niemand." /> : (
                <ul className="space-y-2">
                  {(list as { username: string; display_name: string | null }[]).map((p) => (
                    <li key={p.username}>
                      <Link to="/u/$username" params={{ username: p.username }} className="text-q-white hover:text-q-blue">
                        {p.display_name ?? p.username}
                      </Link>{" "}
                      <span className="text-xs text-muted-foreground">@{p.username}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}
