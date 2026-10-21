import { Link } from "react-router-dom";
import { brandLogo } from "@/lib/hka-content";
import { cn } from "@/lib/utils";

export function Wordmark({ footer = false }: { footer?: boolean }) {
  return (
    <Link to="/" aria-label="HKA Equestrian — Home" className="inline-flex max-w-full shrink-0 rounded-sm">
      <img
        src={brandLogo.src}
        alt={brandLogo.alt}
        width={brandLogo.width}
        height={brandLogo.height}
        loading={footer ? "lazy" : "eager"}
        decoding="async"
        className={cn("block h-auto max-w-full object-contain", footer ? "w-56" : "w-44 sm:w-48")}
      />
    </Link>
  );
}
