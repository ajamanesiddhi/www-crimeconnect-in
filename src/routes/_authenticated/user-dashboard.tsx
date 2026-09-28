import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, FileText, Plus, ShieldCheck } from "lucide-react";
import { DashboardShell } from "@/components/crimeconnect/dashboard-shell";
import { MetricCard } from "@/components/crimeconnect/dashboard-parts";
import { IncidentDetail, IncidentList } from "@/components/crimeconnect/incident-detail";
import { StatusBadge } from "@/components/crimeconnect/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { homeFor, INCIDENT_COLS, STATUS_LABEL, type Incident } from "@/lib/incidents";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/user-dashboard")({
  validateSearch: (s: Record<string, unknown>): { view?: string | undefined } => ({ view: typeof s["view"] === "string" ? (s["view"] as string) : undefined }),
  beforeLoad: ({ context }) => { const home = homeFor(context.roles); if (home !== "/user-dashboard") throw redirect({ to: home }); },
  head: () => ({ meta: [{ title: "My Dashboard — CrimeConnect" }, { name: "description", content: "Report incidents and track your private reports." }, { property: "og:title", content: "CrimeConnect User Dashboard" }, { property: "og:description", content: "Private report tracking workspace." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

const STEPS = ["submitted", "under_review", "verified", "resolved"] as const;

function Page() {
  const { user } = Route.useRouteContext();
  const view = Route.useSearch().view ?? "home";
  const [reports, setReports] = useState<Incident[]>([]);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    supabase.from("incidents").select(INCIDENT_COLS).eq("reporter_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setReports((data as unknown as Incident[]) ?? []));
    supabase.from("profiles").select("display_name,phone").eq("id", user.id).maybeSingle().then(({ data }) => { setName(data?.display_name ?? ""); setPhone(data?.phone ?? ""); });
  }, [user.id]);

  async function saveProfile() {
    const { error } = await supabase.from("profiles").upsert({ id: user.id, display_name: name.trim().slice(0, 100) || "CrimeConnect User", phone: phone.trim().slice(0, 20) || null });
    if (error) toast.error(error.message); else toast.success("Profile saved");
  }

  const active = reports.filter((r) => r.status === "under_review" || r.status === "verified").length;
  const resolved = reports.filter((r) => r.status === "resolved").length;

  return (
    <DashboardShell role="user" title="User Dashboard" subtitle="Your private report activity" activeView={view}>
      {view === "home" && <>
        <section className="rounded-lg border border-primary/30 bg-primary/10 p-6 sm:flex sm:items-center sm:justify-between">
          <div><p className="text-sm font-bold text-primary">WELCOME</p><h2 className="mt-2 text-2xl font-extrabold">Help keep your campus informed</h2><p className="mt-2 text-sm text-muted-foreground">Reports remain private to you and authorized reviewers.</p></div>
          <Button asChild size="xl" className="mt-5 sm:mt-0"><Link to="/report"><Plus />Report an Incident</Link></Button>
        </section>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <MetricCard label="Total Submitted" value={String(reports.length)} detail="Your reports" icon={FileText} />
          <MetricCard label="In Review" value={String(active)} detail="Under review / verified" icon={Clock3} />
          <MetricCard label="Resolved" value={String(resolved)} detail="Closed" icon={CheckCircle2} tone="success" />
        </div>
        <section className="mt-8"><h2 className="mb-4 text-xl font-bold">Recent reports</h2><IncidentList items={reports.slice(0, 5)} onOpen={setSelected} empty="You haven't submitted any reports yet." /></section>
      </>}

      {view === "reports" && <section><h2 className="mb-4 text-xl font-bold">My Reports</h2><IncidentList items={reports} onOpen={setSelected} empty="You haven't submitted any reports yet." /></section>}

      {view === "status" && <section className="grid gap-4">
        <h2 className="text-xl font-bold">Report Status</h2>
        {reports.length === 0 && <p className="text-sm text-muted-foreground">No reports yet.</p>}
        {reports.map((r) => {
          const idx = STEPS.indexOf(r.status as (typeof STEPS)[number]);
          return (
            <article key={r.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold">{r.report_id} • {r.incident_type}</p><StatusBadge status={STATUS_LABEL[r.status]} /></div>
              <div className="mt-4 grid grid-cols-4 gap-2">{STEPS.map((s, i) => <div key={s}><div className={`h-1.5 rounded-full ${i <= idx ? (s === "resolved" ? "bg-success" : "bg-primary") : "bg-secondary"}`} /><p className="mt-2 flex items-center gap-1 text-[11px] font-bold text-muted-foreground">{i <= idx && <ShieldCheck className="size-3" />}{STATUS_LABEL[s]}</p></div>)}</div>
              {r.security_review_note && <p className="mt-3 text-sm text-muted-foreground"><strong>Security note:</strong> {r.security_review_note}</p>}
            </article>
          );
        })}
      </section>}

      {view === "profile" && <section className="max-w-lg rounded-lg border border-border bg-card p-6">
        <h2 className="text-xl font-bold">Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">{user.email} • Role: User</p>
        <div className="mt-5 space-y-4">
          <div><Label htmlFor="n">Name</Label><Input id="n" value={name} onChange={(e) => setName(e.target.value)} className="mt-2" maxLength={100} /></div>
          <div><Label htmlFor="p">Phone (optional)</Label><Input id="p" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-2" maxLength={20} /></div>
          <Button onClick={saveProfile}>Save profile</Button>
        </div>
      </section>}

      {selected && <IncidentDetail inc={selected} onClose={() => setSelected(null)} />}
    </DashboardShell>
  );
}
