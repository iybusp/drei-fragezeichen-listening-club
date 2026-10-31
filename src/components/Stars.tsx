import { useState } from "react";
import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarsDisplay({ rating, className }: { rating: number | null; className?: string }) {
  if (!rating) return null;
  const full = Math.floor(rating);
  const half = rating % 1 !== 0;
  return (
    <span className={cn("inline-flex items-center text-star", className)} aria-label={`${rating} von 5 Sternen`}>
      {Array.from({ length: full }).map((_, i) => (
        <Star key={i} className="size-3.5 fill-current" />
      ))}
      {half && <StarHalf className="size-3.5 fill-current" />}
    </span>
  );
}

export function StarsInput({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  return (
    <div className="flex items-center" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="relative size-8">
          <Star className={cn("absolute inset-0 size-8", shown >= i ? "fill-star text-star" : "text-muted-foreground/40")} />
          {shown === i - 0.5 && (
            <StarHalf className="absolute inset-0 size-8 fill-star text-star" />
          )}
          <button
            type="button"
            aria-label={`${i - 0.5} Sterne`}
            className="absolute inset-y-0 left-0 w-1/2"
            onMouseEnter={() => setHover(i - 0.5)}
            onClick={() => onChange(value === i - 0.5 ? null : i - 0.5)}
          />
          <button
            type="button"
            aria-label={`${i} Sterne`}
            className="absolute inset-y-0 right-0 w-1/2"
            onMouseEnter={() => setHover(i)}
            onClick={() => onChange(value === i ? null : i)}
          />
        </div>
      ))}
    </div>
  );
}
