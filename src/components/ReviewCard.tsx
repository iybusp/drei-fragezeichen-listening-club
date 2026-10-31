import { Link } from "@tanstack/react-router";
import { Heart, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { StarsDisplay } from "./Stars";
import { EpisodeCover } from "./EpisodeCover";
import { fullTitle, type LogRow } from "@/lib/data";

export function ReviewCard({ log, showEpisode = true }: { log: LogRow; showEpisode?: boolean }) {
  const name = log.profiles?.display_name ?? log.profiles?.username ?? "?";
  return (
    <article className="flex gap-4 border-b border-border py-5 last:border-0">
      {showEpisode && log.episodes && <EpisodeCover episode={log.episodes} size={200} className="w-16 shrink-0" />}
      <div className="min-w-0 flex-1">
        {showEpisode && log.episodes && (
          <Link
            to="/folge/$nummer"
            params={{ nummer: String(log.episode_number) }}
            className="font-display text-lg font-bold text-q-white hover:text-q-blue"
          >
            {fullTitle(log.episodes)}
          </Link>
        )}
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Gehört von</span>
          {log.profiles && (
            <Link to="/u/$username" params={{ username: log.profiles.username }} className="font-semibold text-foreground hover:text-q-blue">
              {name}
            </Link>
          )}
          <StarsDisplay rating={log.rating} />
          {log.liked && <Heart className="size-3.5 fill-heart text-heart" />}
          {log.is_relisten && <RotateCcw className="size-3.5" aria-label="Wiederholt gehört" />}
          <span>· {format(new Date(log.listened_on), "d. MMM yyyy", { locale: de })}</span>
        </div>
        {log.review && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground">{log.review}</p>}
      </div>
    </article>
  );
}
