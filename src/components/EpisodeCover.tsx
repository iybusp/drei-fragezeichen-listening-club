import { Link } from "@tanstack/react-router";
import { coverUrl, fullTitle } from "@/lib/data";
import { cn } from "@/lib/utils";

export function EpisodeCover({
  episode,
  size = 300,
  className,
  link = true,
}: {
  episode: { number: number; title: string; cover_path: string | null };
  size?: number;
  className?: string;
  link?: boolean;
}) {
  const img = (
    <div className={cn("poster aspect-square", className)} title={`${episode.number} · ${fullTitle(episode)}`}>
      <img src={coverUrl(episode.cover_path, size)} alt={fullTitle(episode)} loading="lazy" className="h-full w-full object-cover" />
    </div>
  );
  if (!link) return img;
  return (
    <Link to="/folge/$nummer" params={{ nummer: String(episode.number) }} className="block">
      {img}
    </Link>
  );
}
