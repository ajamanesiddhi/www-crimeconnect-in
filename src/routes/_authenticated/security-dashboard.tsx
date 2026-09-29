import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, ShieldCheck } from "lucide-react";
import { DashboardShell } from "@/components/crimeconnect/dashboard-shell";
import { MetricCard } from "@/components/crimeconnect/dashboard-parts";
import { IncidentDetail, IncidentList } from "@/components/crimeconnect/incident-detail";
import { NotificationsPanel } from "@/components/crimeconnect/notifications-panel";
import { ReviewActions } from "@/components/crimeconnect/review-actions";
import { homeFor, STATUS_LABEL, type Incident, type IncidentStatus } from "@/lib/incidents";
import { useLiveIncidents } from "@/lib/use-live-incidents";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/security-dashboard")({
  validateSearch: (s: Record<string, unknown>): { view?: string | undefined } => ({ view: typeof s["view"] === "string" ? (s["view"] as string) : undefined }),
  beforeLoad: ({ context }) => { if (!context.roles.includes("security_officer") && !context.roles.includes("admin")) throw redirect({ to: homeFor(context.roles) }); },
  head: () => ({ meta: [{ title: "Security Officer Dashboard — CrimeConnect" }, { name: "description", content: "Review, verify, and resolve incident reports." }, { property: "og:title", content: "CrimeConnect Security Dashboard" }, { property: "og:description", content: "Authorized incident review workspace." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

function Page() {
  const { user } = Route.useRouteContext();
  const view = Route.useSearch().view ?? "overview";
  const [selected, setSelected] = useState<Incident | null>(null);
  const { incidents, notifs, unread, markRead, reload } = useLiveIncidents(user.id, (n) => toast.info(n.title, { description: n.message }));

  const count = (s: IncidentStatus) => incidents.filter((i) => i.status === s).length;
  const filtered = ["submitted", "under_review", "verified", "resolved", "needs_evidence", "unverified"].includes(view) ? incidents.filter((i) => i.status === view) : incidents;
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
            <IncidentList items={filtered} onOpen={setSelected} empty="No reports in this list." />
          </section>
        </>
      )}

      {selected && (
        <IncidentDetail inc={selected} onClose={() => setSelected(null)} showAi onOpenRelated={(id) => { const r = incidents.find((i) => i.id === id); if (r) setSelected(r); }}>
          <ReviewActions inc={selected} userId={user.id} allowResolve onChanged={(i) => { setSelected(i); reload(); }} />
        </IncidentDetail>
      )}
    </DashboardShell>
  );
}
