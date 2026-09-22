import { MapPin, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="CrimeConnect home">
    <span className="relative grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/25">
      <ShieldCheck className="size-6" /><MapPin className="absolute size-3" />
    </span>
    {!compact && <span className="min-w-0"><strong className="block truncate font-display text-lg">CrimeConnect</strong><span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Report. Track. Protect.</span></span>}
  </Link>;
}