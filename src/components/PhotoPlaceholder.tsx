import { ImageIcon } from "lucide-react";
import { photoSlots, type PhotoSlot } from "@/lib/hka-content";
import { cn } from "@/lib/utils";

const tones = {
  sage: "bg-[#d8ded2]",
  sand: "bg-[#e6ddcd]",
  stone: "bg-[#deded4]",
  clay: "bg-[#e7dbd2]",
  olive: "bg-[#dce0ce]",
};

export function PhotoPlaceholder({ slot, className, compact = false }: { slot: PhotoSlot; className?: string; compact?: boolean }) {
  const photo = photoSlots[slot];
  return (
    <figure data-photo-slot={slot} aria-label={photo.description + " — photo placeholder"} className={cn("relative flex min-w-0 flex-col items-center justify-center overflow-hidden text-primary", tones[photo.tone], className)}>
      <div aria-hidden="true" className={cn("pointer-events-none absolute border border-primary/15", compact ? "inset-3" : "inset-5 sm:inset-7")} />
      <div className={cn("relative flex max-w-full flex-col items-center text-center", compact ? "px-6 py-8" : "px-9 py-14")}>
        <ImageIcon aria-hidden="true" strokeWidth={1} className={cn("mb-4 opacity-60", compact ? "size-6" : "mb-6 size-9")} />
        <span className={cn("font-serif leading-snug", compact ? "text-xl" : "text-3xl sm:text-4xl")}>{photo.label}</span>
        {!compact && <span className="mt-3 max-w-[210px] text-sm leading-relaxed text-primary/80">{photo.description}</span>}
        <figcaption className="mt-5 text-[9px] font-semibold uppercase tracking-[0.19em] text-primary/80">Original photo to come</figcaption>
      </div>
    </figure>
  );
}
