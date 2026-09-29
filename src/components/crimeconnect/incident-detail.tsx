import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABEL, type Incident } from "@/lib/incidents";
import type { Assessment } from "@/lib/assessment.functions";
import { Sparkles } from "lucide-react";

const LocationMap = lazy(() => import("./location-map"));

export function IncidentDetail({ inc, onClose, children, showAi = false, onOpenRelated }: { inc: Incident; onClose: () => void; children?: ReactNode; showAi?: boolean; onOpenRelated?: (id: string) => void }) {
  const [photos, setPhotos] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.from("incident_photos").select("storage_path").eq("incident_id", inc.id);
      const urls: string[] = [];
      for (const p of data ?? []) {
        const { data: s } = await supabase.storage.from("incident-evidence").createSignedUrl(p.storage_path, 300);
        if (s?.signedUrl) urls.push(s.signedUrl);
      }
      if (alive) setPhotos(urls);
    })();
    return () => { alive = false; };
  }, [inc.id]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background/80 p-3 backdrop-blur sm:p-8" role="dialog" aria-modal="true">
      <div className="mx-auto max-w-3xl rounded-lg border border-border bg-card p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">{inc.report_id}{inc.is_demo && " • College demonstration"}</p>
            <h2 className="mt-1 text-2xl font-extrabold">{inc.incident_type}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2"><StatusBadge status={STATUS_LABEL[inc.status]} /><span className="text-xs text-muted-foreground">{inc.category}</span>{inc.acknowledged_at && <span className="text-xs text-success">✓ Acknowledged by Principal</span>}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close"><X /></Button>
        </div>
        <p className="mt-5 leading-7">{inc.description}</p>
        <div className="mt-5 overflow-hidden rounded-lg border border-border">
          <Suspense fallback={<div className="grid h-[260px] place-items-center text-sm">Loading map…</div>}><LocationMap lat={inc.latitude} lng={inc.longitude} height={260} /></Suspense>
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-md bg-secondary p-3"><dt className="text-muted-foreground"><MapPin className="mr-1 inline size-4" />Location</dt><dd className="mt-1 font-semibold">{inc.address || inc.landmark}</dd><dd className="text-xs text-muted-foreground">GPS: {inc.latitude}, {inc.longitude}</dd></div>
          <div className="rounded-md bg-secondary p-3"><dt className="text-muted-foreground">Reported</dt><dd className="mt-1 font-semibold">{new Date(inc.created_at).toLocaleString()}</dd><dd className="text-xs text-muted-foreground">Occurred: {new Date(inc.occurred_at).toLocaleString()}</dd></div>
          <div className="rounded-md bg-secondary p-3"><dt className="text-muted-foreground">Submitted by</dt><dd className="mt-1 font-semibold capitalize">{inc.reporter_role.replace("_", " ")} account (identity protected)</dd></div>
          <div className="rounded-md bg-secondary p-3"><dt className="text-muted-foreground">Security review note</dt><dd className="mt-1">{inc.security_review_note || "No review note yet."}</dd>{inc.reviewed_at && <dd className="text-xs text-muted-foreground">Reviewed {new Date(inc.reviewed_at).toLocaleString()}</dd>}</div>
        </dl>
        <h3 className="mt-5 font-bold">Evidence</h3>
        {photos.length ? <div className="mt-2 grid gap-3 sm:grid-cols-2">{photos.map((u) => <img key={u} src={u} alt="Private incident evidence" className="max-h-72 w-full rounded-md bg-secondary object-contain" />)}</div> : <p className="mt-2 text-sm text-muted-foreground">No photo attached.</p>}
        {showAi && <AssessmentCard a={inc.ai_assessment as Assessment | null | undefined} onOpenRelated={onOpenRelated} />}
        <p className="mt-4 text-xs text-muted-foreground">This record is an allegation pending review, not a proven crime.</p>
        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  );
}

export function IncidentList({ items, onOpen, empty }: { items: Incident[]; onOpen: (i: Incident) => void; empty: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {items.length === 0 && <p className="p-6 text-sm text-muted-foreground">{empty}</p>}
      {items.map((i) => (
        <button key={i.id} onClick={() => onOpen(i)} className="flex w-full flex-wrap items-center justify-between gap-3 border-b border-border p-4 text-left last:border-0 hover:bg-accent">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 font-bold">{i.incident_type}{i.is_demo && <span className="rounded bg-secondary px-1.5 text-[10px] font-bold text-muted-foreground">DEMO</span>}{(i.incident_photos?.length ?? 0) > 0 && <span className="rounded bg-primary/15 px-1.5 text-[10px] font-bold text-primary">PHOTO</span>}</p>
            <p className="truncate text-xs text-muted-foreground">{i.report_id} • {i.landmark} • {new Date(i.created_at).toLocaleString()} • by {i.reporter_role.replace("_", " ")}</p>
          </div>
          <StatusBadge status={STATUS_LABEL[i.status]} />
        </button>
      ))}
    </div>
  );
}

const LOC = { consistent: "Consistent", needs_review: "Needs review", unavailable: "Unavailable" } as const;
const PC = { consistent: "Appear consistent", inconsistent: "May be inconsistent — review", not_applicable: "Single/no photo", unavailable: "Not assessed" } as const;

export function AssessmentCard({ a, onOpenRelated }: { a: Assessment | null | undefined; onOpenRelated?: ((id: string) => void) | undefined }) {
  return (
    <section className="mt-6 rounded-lg border border-primary/40 bg-primary/5 p-5">
      <h3 className="flex items-center gap-2 font-bold"><Sparkles className="size-5 text-primary" />AI-Assisted Evidence Assessment</h3>
      {!a ? <p className="mt-3 text-sm text-muted-foreground">Assessment is being prepared or unavailable for this report.</p> : <>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md bg-background p-3"><p className="text-xs text-muted-foreground">Evidence Level</p><p className={`mt-1 text-xl font-extrabold ${a.level === "Strong" ? "text-success" : a.level === "Moderate" ? "text-primary" : "text-destructive"}`}>{a.level}</p></div>
          <div className="rounded-md bg-background p-3"><p className="text-xs text-muted-foreground">Supporting Evidence</p><p className="mt-1 text-xl font-extrabold">{a.score}/100</p><div className="mt-2 h-1.5 rounded-full bg-secondary"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${a.score}%` }} /></div></div>
          <div className="rounded-md bg-background p-3"><p className="text-xs text-muted-foreground">Status</p><p className="mt-1 text-sm font-extrabold text-destructive">REQUIRES HUMAN VERIFICATION</p></div>
        </div>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="inline text-muted-foreground">Photos: </dt><dd className="inline font-semibold">{a.photos} ({PC[a.photoConsistency]})</dd></div>
          <div><dt className="inline text-muted-foreground">Location: </dt><dd className="inline font-semibold">{LOC[a.location]}</dd></div>
          <div><dt className="inline text-muted-foreground">Description: </dt><dd className="inline font-semibold">{a.description === "detailed" ? "Detailed" : "Limited detail"}</dd></div>
          <div><dt className="inline text-muted-foreground">Related Reports: </dt><dd className="inline font-semibold">{a.relatedReports.length}</dd></div>
          <div className="sm:col-span-2"><dt className="inline text-muted-foreground">Date/time: </dt><dd className="inline">{a.timeCheck}</dd></div>
        </dl>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div><p className="text-xs font-bold text-success">SUPPORTING FACTORS</p><ul className="mt-1 list-disc pl-5 text-sm">{a.supporting.map((x) => <li key={x}>{x}</li>)}</ul></div>
          <div><p className="text-xs font-bold text-destructive">POTENTIAL ISSUES</p><ul className="mt-1 list-disc pl-5 text-sm">{a.issues.length ? a.issues.map((x) => <li key={x}>{x}</li>) : <li>None flagged</li>}</ul></div>
        </div>
        {a.relatedReports.length > 0 && <div className="mt-3"><p className="text-xs font-bold text-muted-foreground">POSSIBLE RELATED REPORTS</p><div className="mt-1 flex flex-wrap gap-2">{a.relatedReports.map((r) => <button key={r.id} onClick={() => onOpenRelated?.(r.id)} className="rounded border border-border bg-background px-2 py-1 text-xs">{r.report_id} • {r.incident_type}</button>)}</div><p className="mt-1 text-xs text-muted-foreground">Multiple reports do not prove an incident occurred.</p></div>}
      </>}
      <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs">AI cannot determine whether an incident is truly real or fake. This assessment only summarizes available evidence. AI assessment is supportive only. Final verification must be done by an authorized Principal or Security Officer.</p>
    </section>
  );
}
