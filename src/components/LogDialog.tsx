import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { StarsInput } from "./Stars";
import { EpisodeCover } from "./EpisodeCover";
import { supabase } from "@/integrations/supabase/client";
import { fullTitle, type Episode } from "@/lib/data";
import { cn } from "@/lib/utils";

export function LogDialog({
  open,
  onOpenChange,
  episode,
  userId,
  hasLoggedBefore,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  episode: Episode;
  userId: string;
  hasLoggedBefore: boolean;
}) {
  const qc = useQueryClient();
  const [rating, setRating] = useState<number | null>(null);
  const [liked, setLiked] = useState(false);
  const [review, setReview] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [relisten, setRelisten] = useState(hasLoggedBefore);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("logs").insert({
      user_id: userId,
      episode_number: episode.number,
      listened_on: date,
      rating,
      liked,
      review: review.trim() || null,
      is_relisten: relisten,
    });
    if (!error) {
      await supabase.from("watchlist").delete().eq("user_id", userId).eq("episode_number", episode.number);
    }
    setSaving(false);
    if (error) {
      toast.error("Speichern fehlgeschlagen");
      return;
    }
    toast.success("Ins Tagebuch eingetragen");
    qc.invalidateQueries();
    setRating(null);
    setLiked(false);
    setReview("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-sm font-normal uppercase tracking-widest text-muted-foreground">
            Ich habe gehört…
          </DialogTitle>
        </DialogHeader>
        <div className="flex gap-4">
          <EpisodeCover episode={episode} className="w-24 shrink-0" link={false} />
          <div className="flex-1 space-y-4">
            <h3 className="text-lg font-bold leading-tight">
              {fullTitle(episode)} <span className="font-sans text-sm font-normal text-muted-foreground">Folge {episode.number}</span>
            </h3>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="date" className="text-xs text-muted-foreground">Gehört am</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 w-40" />
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox checked={relisten} onCheckedChange={(v) => setRelisten(!!v)} /> Schon mal gehört
              </label>
            </div>
            <Textarea placeholder="Rezension schreiben…" value={review} onChange={(e) => setReview(e.target.value)} rows={4} />
            <div className="flex items-center justify-between">
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Bewertung</div>
                <StarsInput value={rating} onChange={setRating} />
              </div>
              <button type="button" onClick={() => setLiked(!liked)} aria-label="Gefällt mir" className="flex flex-col items-center text-xs text-muted-foreground">
                <Heart className={cn("size-8", liked ? "fill-heart text-heart" : "text-muted-foreground/50")} />
                Like
              </button>
            </div>
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>{saving ? "Speichern…" : "Speichern"}</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
