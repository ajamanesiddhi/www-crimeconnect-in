import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Bell, CheckCircle2, ClipboardCheck, FilePlus2, Files, LayoutDashboard, ListChecks, LogOut, Map, Menu, ShieldCheck, Siren, UserRound } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "./brand";
import { Button } from "@/components/ui/button";

type Item = { to: string; view?: string; label: string; icon: typeof Bell };
const roleLinks: Record<"user" | "officer" | "principal", Item[]> = {
  user: [
    { to: "/user-dashboard", view: "home", label: "Dashboard Home", icon: LayoutDashboard },
    { to: "/report", label: "Report an Incident", icon: FilePlus2 },
    { to: "/user-dashboard", view: "reports", label: "My Reports", icon: Files },
    { to: "/user-dashboard", view: "status", label: "Report Status", icon: ListChecks },
    { to: "/user-dashboard", view: "profile", label: "Profile", icon: UserRound },
  ],
  officer: [
    { to: "/security-dashboard", view: "overview", label: "Overview", icon: LayoutDashboard },
    { to: "/security-dashboard", view: "submitted", label: "New Reports", icon: AlertTriangle },
    { to: "/security-dashboard", view: "under_review", label: "Under Review", icon: ClipboardCheck },
    { to: "/security-dashboard", view: "verified", label: "Verified Reports", icon: ShieldCheck },
    { to: "/security-dashboard", view: "resolved", label: "Resolved Reports", icon: CheckCircle2 },
    { to: "/security-dashboard", view: "notifications", label: "Notifications", icon: Bell },
  ],
  principal: [
    { to: "/principal-dashboard", view: "overview", label: "Dashboard", icon: LayoutDashboard },
    { to: "/principal-dashboard", view: "all", label: "All Incidents", icon: Files },
    { to: "/principal-dashboard", view: "submitted", label: "New Alerts", icon: Siren },
    { to: "/principal-dashboard", view: "under_review", label: "Under Review", icon: ClipboardCheck },
    { to: "/principal-dashboard", view: "verified", label: "Verified", icon: ShieldCheck },
    { to: "/principal-dashboard", view: "resolved", label: "Resolved", icon: CheckCircle2 },
    { to: "/principal-dashboard", view: "notifications", label: "Notifications", icon: Bell },
    { to: "/safety-map", label: "Safety Map", icon: Map },
  ],
};
const roleTag = { user: "USER", officer: "SECURITY", principal: "PRINCIPAL" };

export function DashboardShell({ role, title, subtitle, children, activeView, badge }: { role: keyof typeof roleLinks; title: string; subtitle: string; children: ReactNode; activeView?: string; badge?: number }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  async function logout() { await supabase.auth.signOut(); navigate({ to: "/auth", search: { mode: "login" }, replace: true }); }
  return (
    <div className="min-h-screen bg-background">
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-panel-strong p-5 transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-3"><Brand /></div>
        <p className={`mb-6 inline-flex w-fit rounded px-2 py-0.5 text-[10px] font-bold tracking-widest ${role === "principal" ? "bg-destructive/15 text-destructive" : role === "officer" ? "bg-success/15 text-success" : "bg-primary/15 text-primary"}`}>{roleTag[role]} WORKSPACE</p>
        <nav className="grid gap-1 overflow-y-auto">
          {roleLinks[role].map((item, i) => {
            const Icon = item.icon;
            const active = item.view ? activeView === item.view : false;
            return (
              <Link key={`${item.label}-${i}`} to={item.to as "/"} {...(item.view ? { search: { view: item.view } as never } : {})} onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold hover:bg-accent hover:text-foreground ${active ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>
                <Icon className="size-5" />{item.label}
                {item.view === "notifications" && !!badge && <span className="ml-auto rounded-full bg-destructive px-2 text-xs font-bold text-destructive-foreground">{badge}</span>}
              </Link>
            );
          })}
        </nav>
        <Button variant="ghost" className="mt-auto justify-start text-muted-foreground" onClick={logout}><LogOut />Logout</Button>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-40 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-background/90 px-4 py-4 backdrop-blur sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen((v) => !v)} aria-label="Open navigation"><Menu /></Button>
          <div className="min-w-0"><h1 className="truncate text-xl font-bold">{title}</h1><p className="truncate text-xs text-muted-foreground sm:text-sm">{subtitle}</p></div>
          <div className="relative grid size-10 place-items-center rounded-full bg-primary/15 text-primary"><Bell className="size-5" />{!!badge && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">{badge}</span>}</div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
      {open && <button className="fixed inset-0 z-40 bg-background/70 lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation" />}
    </div>
  );
}
