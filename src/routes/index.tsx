import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { episodesQuery, statsQuery, recentReviewsQuery, feedQuery, myFollowingQuery } from "@/lib/data";
import { EpisodeCover } from "@/components/EpisodeCover";
import { ReviewCard } from "@/components/ReviewCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Heart, Headphones } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hörboxd – Dein Tagebuch für Die drei ??? Hörspiele" },
      { name: "description", content: "Halte fest, welche Die drei ??? Folgen du gehört hast, bewerte sie und teile Rezensionen mit anderen Fans." },
      { property: "og:title", content: "Hörboxd – Dein Tagebuch für Die drei ??? Hörspiele" },
      { property: "og:description", content: "Bewerten, rezensieren, Top 4 zeigen – für alle Fans von Justus, Peter und Bob." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(episodesQuery()),
      context.queryClient.ensureQueryData(statsQuery()),
      context.queryClient.ensureQueryData(recentReviewsQuery()),
    ]),
  component: Home,
});

function Home() {
  const { data: episodes } = useSuspenseQuery(episodesQuery());
  const { data: stats } = useSuspenseQuery(statsQuery());
  const { data: reviews } = useSuspenseQuery(recentReviewsQuery());
  const { user, profile } = useAuth();
  const { data: following = [] } = useQuery(myFollowingQuery(user?.id));
  const { data: feed = [] } = useQuery({ ...feedQuery(following), enabled: !!user });

  const statMap = new Map(stats.map((s) => [s.number, s]));
  const popular = [...episodes]
    .sort((a, b) => (statMap.get(b.number)?.log_count ?? 0) - (statMap.get(a.number)?.log_count ?? 0) || a.number - b.number)
    .slice(0, 6);
  const collage = episodes.slice(0, 24);

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid grid-cols-8 gap-1 opacity-30" aria-hidden>
          {collage.map((e) => (
            <EpisodeCover key={e.number} episode={e} size={200} link={false} className="rounded-none shadow-none" />
          ))}
        </div>
        <div className="backdrop-fade absolute inset-0" aria-hidden />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 pb-16 pt-40 text-center">
          {user && profile ? (
            <h1 className="text-3xl font-bold md:text-5xl">
              Willkommen zurück, <span className="text-q-blue">{profile.display_name ?? profile.username}</span>.
            </h1>
          ) : (
            <h1 className="text-3xl font-extrabold leading-tight md:text-5xl">
              Halte fest, was du gehört hast.
              <br />
              Merk dir, was du hören willst.
              <br />
              Erzähl allen, was <span className="text-q-red">gut</span> ist.
            </h1>
          )}
          {!user && (
            <Button asChild size="lg" className="mt-8">
              <Link to="/auth">Kostenlos loslegen</Link>
            </Button>
          )}
          <p className="mt-4 text-sm text-muted-foreground">Das soziale Netzwerk für Fans von Die drei ???</p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-14 px-4">
        <section>
          <h2 className="section-title">Beliebt bei Hörboxd</h2>
          <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
            {popular.map((e) => {
              const s = statMap.get(e.number);
              return (
                <div key={e.number}>
                  <EpisodeCover episode={e} />
                  <div className="mt-1.5 flex gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Headphones className="size-3" />{s?.log_count ?? 0}</span>
                    <span className="flex items-center gap-1"><Heart className="size-3" />{s?.like_count ?? 0}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {!user && (
          <section className="grid gap-4 md:grid-cols-3">
            {[
              ["Tagebuch", "Trag jede gehörte Folge mit Datum ein – auch beim zehnten Mal Gespensterschloss."],
              ["Bewerten & Rezensieren", "Halbe Sterne, Herzchen und Texte. Lies, was andere Fans denken."],
              ["Top 4 & Merkliste", "Zeig deine vier Lieblingsfolgen im Profil und merk dir, was du noch hören willst."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-lg bg-card p-5">
                <h3 className="text-base font-bold">{t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </section>
        )}

        {user && (
          <section>
            <h2 className="section-title">Neues von Leuten, denen du folgst</h2>
            {feed.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Noch nichts hier. Folge anderen Detektiven über ihre Profile, um ihre Aktivitäten zu sehen.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-3 md:grid-cols-8">
                {feed.slice(0, 16).map((l) =>
                  l.episodes ? (
                    <div key={l.id}>
                      <EpisodeCover episode={l.episodes} size={200} />
                      <div className="mt-1 truncate text-[11px] text-muted-foreground">{l.profiles?.display_name ?? l.profiles?.username}</div>
                    </div>
                  ) : null,
                )}
              </div>
            )}
          </section>
        )}

        <section>
          <h2 className="section-title">Neueste Rezensionen</h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Rezensionen – schreib die erste!</p>
          ) : (
            reviews.map((r) => <ReviewCard key={r.id} log={r} />)
          )}
        </section>
      </div>
    </div>
  );
}
