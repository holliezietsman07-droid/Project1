import { useState } from "react";
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
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const eager = slot === "hero" || slot === "founder";

  return (
    <figure data-photo-slot={slot} className={cn("relative min-w-0 overflow-hidden text-primary", tones[photo.tone], className)}>
      {failedSource === photo.src ? (
        <div role="img" aria-label={photo.alt + " — unavailable"} className={cn("absolute inset-0 flex flex-col items-center justify-center gap-3 text-center", compact ? "p-4" : "p-8")}>
          <ImageIcon aria-hidden="true" strokeWidth={1} className="size-7" />
          <span className="text-sm">Photograph unavailable</span>
        </div>
      ) : (
        <img
          src={photo.src}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          className="absolute inset-0 block size-full object-cover"
          style={{ objectPosition: photo.position }}
          onError={() => setFailedSource(photo.src)}
        />
      )}
    </figure>
  );
}
