import { createFileRoute, redirect } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Bell, BellOff, Building2, CheckCircle2, Clock3, Files, MapPin, Siren, X } from "lucide-react";
import { DashboardShell } from "@/components/crimeconnect/dashboard-shell";
import { MetricCard } from "@/components/crimeconnect/dashboard-parts";
import { StatusBadge } from "@/components/crimeconnect/status-badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const LocationMap = lazy(() => import("@/components/crimeconnect/location-map"));

export const Route = createFileRoute("/_authenticated/principal")({
  beforeLoad: ({ context }) => { if (!context.roles.includes("principal") && !context.roles.includes("admin")) throw redirect({ to: "/dashboard" }); },
  head: () => ({ meta: [{ title: "Institution Safety — CrimeConnect" }, { name: "description", content: "Institution-scoped safety overview with real-time incident alerts." }, { property: "og:title", content: "CrimeConnect Principal Dashboard" }, { property: "og:description", content: "Institution-authorized safety monitoring." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

type Incident = { id: string; report_id: string; incident_type: string; category: string; description: string; landmark: string; address: string | null; latitude: number; longitude: number; status: "submitted" | "under_review" | "referred" | "resolved"; created_at: string; occurred_at: string; reporter_role: string; acknowledged_at: string | null; is_demo: boolean };
type Alert = { notificationId: string; incident: Incident };
const STATUS_LABEL = { submitted: "Submitted", under_review: "Under Review", referred: "Referred to Authorities", resolved: "Resolved" } as const;
const COLS = "id,report_id,incident_type,category,description,landmark,address,latitude,longitude,status,created_at,occurred_at,reporter_role,acknowledged_at,is_demo";

function beep() {
  try {
    const ctx = new AudioContext();
    [0, 0.35, 0.7].forEach((t) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "square"; o.frequency.value = 880; g.gain.value = 0.08;
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch { /* audio unavailable */ }
}

function Page() {
  const { user } = Route.useRouteContext();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [unread, setUnread] = useState(0);
  const [alert, setAlert] = useState<Alert | null>(null);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  const selectedRef = useRef<(i: Incident) => void>(() => {});

  const load = useCallback(async () => {
    const [{ data }, { count }] = await Promise.all([
      supabase.from("incidents").select(COLS).order("created_at", { ascending: false }).limit(50),
      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false),
    ]);
    setIncidents((data as Incident[]) ?? []); setUnread(count ?? 0);
  }, [user.id]);

  useEffect(() => { setPerm(typeof Notification === "undefined" ? "unsupported" : Notification.permission); load(); }, [load]);
  selectedRef.current = (i) => setSelected(i);

  useEffect(() => {
    const ch = supabase.channel(`principal-alerts-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, async (payload) => {
        const n = payload.new as { id: string; incident_id: string | null; title: string; message: string };
        setUnread((u) => u + 1);
        if (!n.incident_id) return;
        const { data } = await supabase.from("incidents").select(COLS).eq("id", n.incident_id).maybeSingle();
        if (!data) return;
        const inc = data as Incident;
        setIncidents((list) => [inc, ...list.filter((x) => x.id !== inc.id)]);
        setAlert({ notificationId: n.id, incident: inc });
        beep();
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          const bn = new Notification(n.title, { body: n.message, tag: inc.id });
          bn.onclick = () => { window.focus(); selectedRef.current(inc); bn.close(); };
        }
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user.id]);

  async function askPermission() {
    if (typeof Notification === "undefined") return;
    if (window.top !== window.self) { toast.info("Open the app in its own browser tab to allow notifications."); return; }
    setPerm(await Notification.requestPermission());
  }

  async function acknowledge(inc: Incident, notificationId?: string) {
    const { error } = await supabase.from("incidents").update({ acknowledged_at: new Date().toISOString(), acknowledged_by: user.id }).eq("id", inc.id);
    if (error) { toast.error(error.message); return; }
    if (notificationId) await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);
    else await supabase.from("notifications").update({ is_read: true }).eq("incident_id", inc.id).eq("user_id", user.id);
    setAlert(null); toast.success("Alert acknowledged"); load();
    setSelected((s) => (s?.id === inc.id ? { ...s, acknowledged_at: new Date().toISOString() } : s));
  }

  async function setStatus(inc: Incident, status: Incident["status"]) {
    const { error } = await supabase.from("incidents").update({ status }).eq("id", inc.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("incident_reviews").insert({ incident_id: inc.id, reviewer_id: user.id, previous_status: inc.status, new_status: status, notes: `Status changed to ${STATUS_LABEL[status]} by Principal.` });
    toast.success(`Marked as ${STATUS_LABEL[status]}`); load();
    setSelected({ ...inc, status });
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

  const pending = incidents.filter((i) => i.status === "submitted" || i.status === "under_review").length;
  const resolved = incidents.filter((i) => i.status === "resolved").length;
  const unacked = incidents.filter((i) => !i.acknowledged_at).length;

  return (
    <DashboardShell role="principal" title="Institution Safety Overview" subtitle="D. Y. Patil College of Engineering, Kolhapur">
      {alert && (
        <section role="alert" className="mb-6 animate-pulse rounded-lg border-2 border-destructive bg-destructive/15 p-5 [animation-iteration-count:3]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-4">
              <Siren className="size-10 shrink-0 text-destructive" />
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-destructive">{alert.incident.is_demo ? "DEMO ALERT • College demonstration" : "Alert"}</p>
                <h2 className="mt-1 text-2xl font-extrabold">🚨 NEW CRIME REPORT</h2>
                <p className="mt-1 text-sm">A new incident has been reported.</p>
                <p className="mt-2 text-sm"><strong>Location:</strong> {alert.incident.address || alert.incident.landmark}</p>
                <p className="text-sm"><strong>Time:</strong> {new Date(alert.incident.created_at).toLocaleString()}</p>
                <p className="text-sm"><strong>Report ID:</strong> {alert.incident.report_id}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="lg" onClick={() => setSelected(alert.incident)}>VIEW INCIDENT</Button>
              <Button size="lg" variant="destructive" onClick={() => acknowledge(alert.incident, alert.notificationId)}>ACKNOWLEDGE ALERT</Button>
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
          <div className="flex items-center gap-3">
            <span className="relative"><Bell className="size-6" />{unread > 0 && <span className="absolute -right-2 -top-2 grid min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">{unread}</span>}</span>
            <Button variant="glass" onClick={testAlert}><Siren />Test Principal Alert (Demo)</Button>
          </div>
        </div>
      </section>

      {perm === "default" && (
        <section className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
          <p className="text-sm">CrimeConnect uses notifications to alert authorized Principal accounts when a new incident is reported.</p>
          <Button onClick={askPermission}><Bell />Enable notifications</Button>
        </section>
      )}
      {(perm === "denied" || perm === "unsupported") && (
        <p className="mt-4 flex items-center gap-2 rounded-md border border-border bg-secondary p-3 text-xs text-muted-foreground"><BellOff className="size-4" />Browser notifications are disabled. In-dashboard emergency alerts still work. Allow notifications in your browser's site settings to re-enable them.</p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="College Reports" value={String(incidents.length).padStart(2, "0")} detail="Institution only" icon={Files} />
        <MetricCard label="Pending Review" value={String(pending).padStart(2, "0")} detail="Submitted / under review" icon={Clock3} tone="alert" />
        <MetricCard label="Unacknowledged" value={String(unacked).padStart(2, "0")} detail="Needs attention" icon={AlertTriangle} tone="alert" />
        <MetricCard label="Resolved" value={String(resolved).padStart(2, "0")} detail="Verified outcomes" icon={CheckCircle2} tone="success" />
      </div>

      <section className="mt-8">
        <div className="mb-4"><h2 className="text-xl font-bold">Recent institution reports</h2><p className="mt-1 text-sm text-muted-foreground">Newest first. Reports from unrelated institutions are not visible.</p></div>
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {incidents.length === 0 && <p className="p-6 text-sm text-muted-foreground">No reports yet. Use "Test Principal Alert" to demonstrate.</p>}
          {incidents.map((i) => (
            <button key={i.id} onClick={() => setSelected(i)} className="flex w-full flex-wrap items-center justify-between gap-3 border-b border-border p-4 text-left last:border-0 hover:bg-accent">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-bold">{!i.acknowledged_at && <span className="size-2 rounded-full bg-destructive" />}{i.incident_type}{i.is_demo && <span className="rounded bg-secondary px-1.5 text-[10px] font-bold text-muted-foreground">DEMO</span>}</p>
                <p className="truncate text-xs text-muted-foreground">{i.report_id} • {i.category} • {i.landmark} • {new Date(i.created_at).toLocaleString()}</p>
              </div>
              <StatusBadge status={STATUS_LABEL[i.status]} />
            </button>
          ))}
        </div>
      </section>

      {selected && <IncidentDetail inc={selected} onClose={() => setSelected(null)} onAck={() => acknowledge(selected)} onStatus={(s) => setStatus(selected, s)} />}
    </DashboardShell>
  );
}

function IncidentDetail({ inc, onClose, onAck, onStatus }: { inc: Incident; onClose: () => void; onAck: () => void; onStatus: (s: Incident["status"]) => void }) {
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
            <div className="mt-2 flex flex-wrap items-center gap-2"><StatusBadge status={STATUS_LABEL[inc.status]} /><span className="text-xs text-muted-foreground">{inc.category}</span>{inc.acknowledged_at && <span className="text-xs text-success">✓ Acknowledged</span>}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close"><X /></Button>
        </div>
        <p className="mt-5 leading-7">{inc.description}</p>
        <div className="mt-5 overflow-hidden rounded-lg border border-border">
          <Suspense fallback={<div className="grid h-[260px] place-items-center text-sm">Loading map…</div>}><LocationMap lat={inc.latitude} lng={inc.longitude} height={260} /></Suspense>
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-md bg-secondary p-3"><dt className="text-muted-foreground"><MapPin className="mr-1 inline size-4" />Location</dt><dd className="mt-1 font-semibold">{inc.address || inc.landmark}</dd><dd className="text-xs text-muted-foreground">{inc.latitude}, {inc.longitude}</dd></div>
          <div className="rounded-md bg-secondary p-3"><dt className="text-muted-foreground">Reported</dt><dd className="mt-1 font-semibold">{new Date(inc.created_at).toLocaleString()}</dd><dd className="text-xs text-muted-foreground">Occurred: {new Date(inc.occurred_at).toLocaleString()}</dd></div>
          <div className="rounded-md bg-secondary p-3 sm:col-span-2"><dt className="text-muted-foreground">Reporter</dt><dd className="mt-1 font-semibold capitalize">{inc.reporter_role.replace("_", " ")} account (identity protected)</dd></div>
        </dl>
        <h3 className="mt-5 font-bold">Evidence</h3>
        {photos.length ? <div className="mt-2 grid gap-3 sm:grid-cols-2">{photos.map((u) => <img key={u} src={u} alt="Private incident evidence" className="max-h-72 w-full rounded-md object-contain bg-secondary" />)}</div> : <p className="mt-2 text-sm text-muted-foreground">No photo attached.</p>}
        <p className="mt-4 text-xs text-muted-foreground">This record is an allegation pending review, not a verified crime.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Button size="lg" variant="destructive" disabled={!!inc.acknowledged_at} onClick={onAck}>{inc.acknowledged_at ? "Acknowledged" : "Acknowledge"}</Button>
          <Button size="lg" variant="glass" disabled={inc.status === "under_review"} onClick={() => onStatus("under_review")}>Mark Under Review</Button>
          <Button size="lg" disabled={inc.status === "resolved"} onClick={() => onStatus("resolved")}>Mark Resolved</Button>
        </div>
      </div>
    </div>
  );
}
