import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, Heart, Clock, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { episodeQuery, episodeLogsQuery, myEpisodeStateQuery, coverUrl, fullTitle, formatDuration } from "@/lib/data";
import { EpisodeCover } from "@/components/EpisodeCover";
import { ReviewCard } from "@/components/ReviewCard";
import { LogDialog } from "@/components/LogDialog";
import { StarsDisplay } from "@/components/Stars";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/folge/$nummer")({
  loader: async ({ context, params }) => {
    const n = Number(params.nummer);
    const ep = await context.queryClient.ensureQueryData(episodeQuery(n));
    if (!ep) throw notFound();
    await context.queryClient.ensureQueryData(episodeLogsQuery(n));
    return { title: fullTitle(ep), description: ep.description ?? "", image: coverUrl(ep.cover_path, 600) };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.title} – Hörboxd` },
          { name: "description", content: loaderData.description },
          { property: "og:title", content: `${loaderData.title} – Hörboxd` },
          { property: "og:description", content: loaderData.description },
          { property: "og:image", content: loaderData.image },
          { name: "twitter:image", content: loaderData.image },
        ]
      : [{ title: "Folge nicht gefunden – Hörboxd" }, { name: "robots", content: "noindex" }],
  }),
  component: EpisodePage,
});

function EpisodePage() {
  const n = Number(Route.useParams().nummer);
  const { data: ep } = useSuspenseQuery(episodeQuery(n));
  const { data: logs } = useSuspenseQuery(episodeLogsQuery(n));
  const { user } = useAuth();
  const { data: mine } = useQuery(myEpisodeStateQuery(user?.id, n));
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  if (!ep) return null;

  const rated = logs.filter((l) => l.rating);
  const avg = rated.length ? rated.reduce((s, l) => s + Number(l.rating), 0) / rated.length : null;
  const buckets = Array.from({ length: 10 }, (_, i) => rated.filter((l) => Number(l.rating) === (i + 1) / 2).length);
  const maxB = Math.max(1, ...buckets);
  const reviews = logs.filter((l) => l.review);
  const listened = (mine?.logs.length ?? 0) > 0;
  const myLiked = mine?.logs.some((l) => l.liked);
  const myRating = mine?.logs.find((l) => l.rating)?.rating ?? null;

  async function toggleWatchlist() {
    if (!user) return;
    if (mine?.onWatchlist) {
      await supabase.from("watchlist").delete().eq("user_id", user.id).eq("episode_number", n);
      toast("Von der Merkliste entfernt");
    } else {
      await supabase.from("watchlist").insert({ user_id: user.id, episode_number: n });
      toast.success("Auf die Merkliste gesetzt");
    }
    qc.invalidateQueries({ queryKey: ["me", user.id] });
  }

  return (
    <div>
      <div className="relative h-72 overflow-hidden" aria-hidden>
        <img src={coverUrl(ep.cover_path, 600)} alt="" className="h-full w-full scale-110 object-cover opacity-40 blur-2xl" />
        <div className="backdrop-fade absolute inset-0" />
      </div>
      <div className="mx-auto -mt-44 grid max-w-6xl gap-8 px-4 md:grid-cols-[230px_1fr_250px]">
        <div className="relative">
          <EpisodeCover episode={ep} size={600} link={false} />
          <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Eye className="size-3.5" />{logs.length}</span>
            <span className="flex items-center gap-1"><Heart className="size-3.5" />{logs.filter((l) => l.liked).length}</span>
          </div>
        </div>

        <div className="relative pt-16">
          <div className="text-sm text-muted-foreground">Folge {ep.number}</div>
          <h1 className="text-3xl font-extrabold leading-tight md:text-4xl">
            <span className="text-q-white">Die drei </span>
            <span className="text-q-white">?</span><span className="text-q-red">?</span><span className="text-q-blue">?</span>{" "}
            {ep.title}
          </h1>
          <div className="mt-2 flex flex-wrap gap-x-4 text-sm text-muted-foreground">
            {ep.release_date && <span>{new Date(ep.release_date).getFullYear()}</span>}
            {ep.author && <span>Buch von <span className="text-foreground">{ep.author}</span></span>}
            {ep.duration_minutes ? <span className="flex items-center gap-1"><Clock className="size-3.5" />{formatDuration(ep.duration_minutes)}</span> : null}
          </div>
          <p className="mt-6 max-w-prose leading-relaxed">{ep.description}</p>

          <section className="mt-12">
            <h2 className="section-title">Rezensionen</h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch keine Rezensionen.</p>
            ) : (
              reviews.map((r) => <ReviewCard key={r.id} log={r} showEpisode={false} />)
            )}
          </section>
        </div>

        <aside className="relative space-y-4 md:pt-16">
          <div className="rounded-md bg-card p-4">
            {user ? (
              <>
                <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-muted-foreground">
                  <div className="flex flex-col items-center gap-1">
                    <Eye className={cn("size-7", listened ? "text-star" : "")} />
                    {listened ? "Gehört" : "Hören"}
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Heart className={cn("size-7", myLiked ? "fill-heart text-heart" : "")} />
                    Like
                  </div>
                  <button onClick={toggleWatchlist} className="flex flex-col items-center gap-1 hover:text-q-white">
                    {mine?.onWatchlist ? <Check className="size-7 text-q-blue" /> : <Plus className="size-7" />}
                    Merkliste
                  </button>
                </div>
                {myRating && (
                  <div className="mt-3 flex justify-center border-t border-border pt-3">
                    <StarsDisplay rating={Number(myRating)} />
                  </div>
                )}
                <Button className="mt-4 w-full" variant="secondary" onClick={() => setOpen(true)}>
                  {listened ? "Nochmal eintragen…" : "Bewerten oder eintragen…"}
                </Button>
                <LogDialog open={open} onOpenChange={setOpen} episode={ep} userId={user.id} hasLoggedBefore={listened} />
              </>
            ) : (
              <p className="text-center text-sm">
                <Link to="/auth" className="font-semibold text-q-blue hover:underline">Melde dich an</Link>, um diese Folge zu bewerten.
              </p>
            )}
          </div>

          <div>
            <h2 className="section-title flex justify-between">
              <span>Bewertungen</span>
              <span>{rated.length}</span>
            </h2>
            <div className="flex items-end gap-2">
              <div className="flex h-16 flex-1 items-end gap-0.5">
                {buckets.map((b, i) => (
                  <div key={i} className="flex-1 rounded-t-sm bg-muted-foreground/40" style={{ height: `${Math.max(2, (b / maxB) * 100)}%` }} title={`${(i + 1) / 2} ★: ${b}`} />
                ))}
              </div>
              <div className="text-center">
                <div className="font-display text-2xl font-bold text-q-white">{avg ? avg.toFixed(1) : "–"}</div>
                <StarsDisplay rating={avg ? Math.round(avg * 2) / 2 : null} />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
