import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Bell, BellOff, Building2, CheckCircle2, ClipboardCheck, Files, ShieldCheck, Siren } from "lucide-react";
import { DashboardShell } from "@/components/crimeconnect/dashboard-shell";
import { MetricCard } from "@/components/crimeconnect/dashboard-parts";
import { IncidentDetail, IncidentList } from "@/components/crimeconnect/incident-detail";
import { NotificationsPanel } from "@/components/crimeconnect/notifications-panel";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { beep, homeFor, STATUS_LABEL, type Incident, type IncidentStatus } from "@/lib/incidents";
import { useLiveIncidents } from "@/lib/use-live-incidents";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/principal-dashboard")({
  validateSearch: (s: Record<string, unknown>) => ({ view: typeof s["view"] === "string" ? (s["view"] as string) : "overview" }),
  beforeLoad: ({ context }) => { if (!context.roles.includes("principal") && !context.roles.includes("admin")) throw redirect({ to: homeFor(context.roles) }); },
  head: () => ({ meta: [{ title: "Principal Dashboard — CrimeConnect" }, { name: "description", content: "Institution-scoped incident monitoring with real-time alerts." }, { property: "og:title", content: "CrimeConnect Principal Dashboard" }, { property: "og:description", content: "Real-time incident alerts for authorized Principals." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

type Alert = { notificationId: string; incident: Incident };

function Page() {
  const { user } = Route.useRouteContext();
  const { view } = Route.useSearch();
  const [alert, setAlert] = useState<Alert | null>(null);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  const openRef = useRef<(i: Incident) => void>(() => {});
  openRef.current = (i) => setSelected(i);

  const { incidents, notifs, unread, markRead, reload } = useLiveIncidents(user.id, (n, inc) => {
    if (!inc) return;
    setAlert({ notificationId: n.id, incident: inc });
    beep();
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      const bn = new Notification(n.title, { body: n.message, tag: inc.id });
      bn.onclick = () => { window.focus(); openRef.current(inc); bn.close(); };
    }
  });

  useEffect(() => { setPerm(typeof Notification === "undefined" ? "unsupported" : Notification.permission); }, []);

  async function askPermission() {
    if (typeof Notification === "undefined") return;
    if (window.top !== window.self) { toast.info("Open the app in its own browser tab to allow notifications."); return; }
    setPerm(await Notification.requestPermission());
  }

  async function acknowledge(inc: Incident) {
    const now = new Date().toISOString();
    const { error } = await supabase.from("incidents").update({ acknowledged_at: now, acknowledged_by: user.id }).eq("id", inc.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("notifications").update({ is_read: true }).eq("incident_id", inc.id).eq("user_id", user.id);
    setAlert(null); toast.success("Alert acknowledged"); reload();
    setSelected((s) => (s?.id === inc.id ? { ...s, acknowledged_at: now } : s));
  }

  async function testAlert() {
    const { data: profile } = await supabase.from("profiles").select("institution_id").eq("id", user.id).maybeSingle();
    const { error } = await supabase.from("incidents").insert({
      reporter_id: user.id, institution_id: profile?.institution_id ?? null, incident_type: "DEMO ALERT — Test Principal Alert", category: "Other",
      description: "COLLEGE DEMONSTRATION: This is a test alert created by the Principal account. It is not a real incident.",
      occurred_at: new Date().toISOString(), landmark: "Main Gate, D. Y. Patil College (Demo)", latitude: 16.7049, longitude: 74.2433, is_demo: true, status: "submitted",
    });
    if (error) toast.error(error.message); else toast.info("Demo alert sent — it will appear in a moment.");
  }

  const count = (s: IncidentStatus) => incidents.filter((i) => i.status === s).length;
  const filtered = ["submitted", "under_review", "verified", "resolved"].includes(view) ? incidents.filter((i) => i.status === view) : incidents;
  const titleFor: Record<string, string> = { overview: "Recent incidents", all: "All incidents", submitted: "New alerts", under_review: "Under review", verified: "Verified", resolved: "Resolved" };

  return (
    <DashboardShell role="principal" title="Principal Dashboard" subtitle="D. Y. Patil College of Engineering, Kolhapur" activeView={view} badge={unread}>
      {alert && (
        <section role="alert" className="mb-6 rounded-lg border-2 border-destructive bg-destructive/15 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-4">
              <Siren className="size-10 shrink-0 animate-pulse text-destructive" />
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-destructive">{alert.incident.is_demo ? "DEMO ALERT • College demonstration" : "Alert"}</p>
                <h2 className="mt-1 text-2xl font-extrabold">🚨 NEW INCIDENT REPORT</h2>
                <p className="mt-2 text-sm"><strong>Report ID:</strong> {alert.incident.report_id}</p>
                <p className="text-sm"><strong>Incident:</strong> {alert.incident.incident_type}</p>
                <p className="text-sm"><strong>Location:</strong> {alert.incident.address || alert.incident.landmark}</p>
                <p className="text-sm"><strong>Time:</strong> {new Date(alert.incident.created_at).toLocaleString()}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="lg" onClick={() => { setSelected(alert.incident); markRead(alert.notificationId); }}>VIEW REPORT</Button>
              <Button size="lg" variant="destructive" onClick={() => acknowledge(alert.incident)}>ACKNOWLEDGE ALERT</Button>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-lg border border-primary/30 bg-primary/10 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid size-12 place-items-center rounded-lg bg-primary text-primary-foreground"><Building2 /></span>
            <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Authorized institution</p><h2 className="mt-1 text-xl font-bold">D. Y. Patil College of Engineering, Kolhapur</h2></div>
          </div>
          <Button variant="glass" onClick={testAlert}><Siren />Test Principal Alert (Demo)</Button>
        </div>
      </section>

      {perm === "default" && (
        <section className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
          <p className="text-sm">CrimeConnect uses notifications to alert authorized Principal accounts when a new incident is reported.</p>
          <Button onClick={askPermission}><Bell />Enable notifications</Button>
        </section>
      )}
      {(perm === "denied" || perm === "unsupported") && (
        <p className="mt-4 flex items-center gap-2 rounded-md border border-border bg-secondary p-3 text-xs text-muted-foreground"><BellOff className="size-4" />Browser notifications are disabled. In-dashboard alerts still work. Allow notifications in your browser's site settings to re-enable them.</p>
      )}

      {view === "notifications" ? (
        <div className="mt-6"><NotificationsPanel items={notifs} onMarkAll={() => markRead()} onOpen={(n) => { markRead(n.id); const inc = incidents.find((i) => i.id === n.incident_id); if (inc) setSelected(inc); }} /></div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="Total Reports" value={String(incidents.length)} detail="Institution only" icon={Files} />
            <MetricCard label="New Reports" value={String(count("submitted"))} detail="Awaiting review" icon={AlertTriangle} tone="alert" />
            <MetricCard label="Under Review" value={String(count("under_review"))} detail="Security reviewing" icon={ClipboardCheck} />
            <MetricCard label="Verified" value={String(count("verified"))} detail="Confirmed by security" icon={ShieldCheck} />
            <MetricCard label="Resolved" value={String(count("resolved"))} detail="Closed" icon={CheckCircle2} tone="success" />
          </div>
          <section className="mt-8">
            <h2 className="mb-4 text-xl font-bold">{titleFor[view] ?? "Incidents"}</h2>
            <IncidentList items={view === "overview" ? filtered.slice(0, 10) : filtered} onOpen={setSelected} empty='No reports here yet. Use "Test Principal Alert" to demonstrate.' />
          </section>
        </>
      )}

      {selected && (
        <IncidentDetail inc={selected} onClose={() => setSelected(null)}>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" variant="destructive" disabled={!!selected.acknowledged_at} onClick={() => acknowledge(selected)}>{selected.acknowledged_at ? "Acknowledged" : "Acknowledge"}</Button>
            <p className="self-center text-xs text-muted-foreground">Current status: <strong>{STATUS_LABEL[selected.status]}</strong> — status changes are made by Security Officers.</p>
          </div>
        </IncidentDetail>
      )}
    </DashboardShell>
  );
}
