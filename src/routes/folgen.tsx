import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { episodesQuery, statsQuery } from "@/lib/data";
import { EpisodeCover } from "@/components/EpisodeCover";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/folgen")({
  head: () => ({
    meta: [
      { title: "Alle Folgen – Hörboxd" },
      { name: "description", content: "Stöbere durch die klassischen Die drei ??? Hörspielfolgen und finde deinen nächsten Fall." },
      { property: "og:title", content: "Alle Folgen – Hörboxd" },
      { property: "og:description", content: "Die klassischen Die drei ??? Hörspiele, sortiert nach Nummer, Bewertung oder Beliebtheit." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(episodesQuery()), context.queryClient.ensureQueryData(statsQuery())]),
  component: Folgen,
});

function Folgen() {
  const { data: episodes } = useSuspenseQuery(episodesQuery());
  const { data: stats } = useSuspenseQuery(statsQuery());
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("nummer");

  const list = useMemo(() => {
    const m = new Map(stats.map((s) => [s.number, s]));
    const f = episodes.filter((e) => `${e.number} ${e.title} ${e.author}`.toLowerCase().includes(q.toLowerCase()));
    if (sort === "rating") f.sort((a, b) => (m.get(b.number)?.avg_rating ?? 0) - (m.get(a.number)?.avg_rating ?? 0));
    if (sort === "beliebt") f.sort((a, b) => (m.get(b.number)?.log_count ?? 0) - (m.get(a.number)?.log_count ?? 0));
    if (sort === "nummer-desc") f.sort((a, b) => b.number - a.number);
    return f;
  }, [episodes, stats, q, sort]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-bold">Folgen</h1>
        <div className="flex gap-2">
          <Input placeholder="Suchen…" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nummer">Nummer aufsteigend</SelectItem>
              <SelectItem value="nummer-desc">Nummer absteigend</SelectItem>
              <SelectItem value="rating">Beste Bewertung</SelectItem>
              <SelectItem value="beliebt">Am beliebtesten</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {list.map((e) => (
          <div key={e.number}>
            <EpisodeCover episode={e} size={300} />
            <div className="mt-1 truncate text-[11px] text-muted-foreground">
              {e.number} · {e.title.replace(/^und (der|die|das) /, "")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
