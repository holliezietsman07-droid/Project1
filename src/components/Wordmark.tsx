import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" aria-label="HKA Equestrian — Home" className={cn("inline-flex shrink-0 items-center gap-3", light ? "text-background" : "text-primary")}>
      <span className="font-serif text-[43px] leading-none tracking-[-0.07em]">HKA</span>
      <span className={cn("h-9 w-px", light ? "bg-background/30" : "bg-primary/25")} aria-hidden="true" />
      <span className="flex flex-col gap-1">
        <span className="text-[11px] font-medium uppercase tracking-[0.2em]">Equestrian</span>
        <span className={cn("text-[8px] uppercase tracking-[0.24em]", light ? "text-background/70" : "text-muted-foreground")}>Online Academy</span>
      </span>
    </Link>
  );
}
