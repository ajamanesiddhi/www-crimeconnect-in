import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, ShieldCheck } from "lucide-react";
import { DashboardShell } from "@/components/crimeconnect/dashboard-shell";
import { MetricCard } from "@/components/crimeconnect/dashboard-parts";
import { IncidentDetail, IncidentList } from "@/components/crimeconnect/incident-detail";
import { NotificationsPanel } from "@/components/crimeconnect/notifications-panel";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { homeFor, STATUS_LABEL, type Incident, type IncidentStatus } from "@/lib/incidents";
import { useLiveIncidents } from "@/lib/use-live-incidents";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/security-dashboard")({
  validateSearch: (s: Record<string, unknown>): { view?: string } => ({ view: typeof s["view"] === "string" ? (s["view"] as string) : undefined }),
  beforeLoad: ({ context }) => { if (!context.roles.includes("security_officer") && !context.roles.includes("admin")) throw redirect({ to: homeFor(context.roles) }); },
  head: () => ({ meta: [{ title: "Security Officer Dashboard — CrimeConnect" }, { name: "description", content: "Review, verify, and resolve incident reports." }, { property: "og:title", content: "CrimeConnect Security Dashboard" }, { property: "og:description", content: "Authorized incident review workspace." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

function Page() {
  const { user } = Route.useRouteContext();
  const view = Route.useSearch().view ?? "overview";
  const [selected, setSelected] = useState<Incident | null>(null);
  const [note, setNote] = useState("");
  const { incidents, notifs, unread, markRead, reload } = useLiveIncidents(user.id, (n) => toast.info(n.title, { description: n.message }));

  async function update(inc: Incident, status: IncidentStatus | null) {
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { reviewed_by: user.id, reviewed_at: now };
    if (note.trim()) patch["security_review_note"] = note.trim().slice(0, 2000);
    if (status) patch["status"] = status;
    if (status === "resolved") patch["resolved_at"] = now;
    const { error } = await supabase.from("incidents").update(patch).eq("id", inc.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("incident_reviews").insert({ incident_id: inc.id, reviewer_id: user.id, previous_status: inc.status, new_status: status ?? inc.status, notes: note.trim() || `Status changed to ${STATUS_LABEL[status ?? inc.status]}.` });
    toast.success(status ? `Marked as ${STATUS_LABEL[status]}` : "Review note saved");
    setSelected({ ...inc, status: status ?? inc.status, security_review_note: note.trim() || inc.security_review_note, reviewed_at: now });
    setNote(""); reload();
  }

  const count = (s: IncidentStatus) => incidents.filter((i) => i.status === s).length;
  const filtered = ["submitted", "under_review", "verified", "resolved"].includes(view) ? incidents.filter((i) => i.status === view) : incidents;
  const titleFor: Record<string, string> = { overview: "All reports", submitted: "New reports", under_review: "Under review", verified: "Verified reports", resolved: "Resolved reports" };

  return (
    <DashboardShell role="officer" title="Security Officer Dashboard" subtitle="Review queue • Kolhapur campus zone" activeView={view} badge={unread}>
      {view === "notifications" ? (
        <NotificationsPanel items={notifs} onMarkAll={() => markRead()} onOpen={(n) => { markRead(n.id); const inc = incidents.find((i) => i.id === n.incident_id); if (inc) setSelected(inc); }} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="New Reports" value={String(count("submitted"))} detail="Start review" icon={AlertTriangle} tone="alert" />
            <MetricCard label="Under Review" value={String(count("under_review"))} detail="In progress" icon={ClipboardCheck} />
            <MetricCard label="Verified" value={String(count("verified"))} detail="Confirmed" icon={ShieldCheck} />
            <MetricCard label="Resolved" value={String(count("resolved"))} detail="Closed" icon={CheckCircle2} tone="success" />
          </div>
          <p className="mt-6 text-xs font-bold tracking-widest text-muted-foreground">WORKFLOW: NEW → UNDER REVIEW → VERIFIED → RESOLVED</p>
          <section className="mt-4">
            <h2 className="mb-4 text-xl font-bold">{titleFor[view] ?? "Reports"}</h2>
            <IncidentList items={filtered} onOpen={(i) => { setSelected(i); setNote(""); }} empty="No reports in this list." />
          </section>
        </>
      )}

      {selected && (
        <IncidentDetail inc={selected} onClose={() => setSelected(null)}>
          <label htmlFor="note" className="text-sm font-bold">Add review note</label>
          <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} className="mt-2 min-h-24 w-full rounded-md border border-input bg-transparent p-3 text-sm" placeholder="Observations, actions taken…" />
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <Button size="lg" variant="glass" disabled={!note.trim()} onClick={() => update(selected, null)}>Save Note</Button>
            <Button size="lg" disabled={selected.status !== "submitted"} onClick={() => update(selected, "under_review")}>Start Review</Button>
            <Button size="lg" disabled={selected.status !== "under_review"} onClick={() => update(selected, "verified")}>Verify Incident</Button>
            <Button size="lg" variant="premium" disabled={selected.status === "resolved" || selected.status === "submitted"} onClick={() => update(selected, "resolved")}>Mark Resolved</Button>
          </div>
        </IncidentDetail>
      )}
    </DashboardShell>
  );
}
