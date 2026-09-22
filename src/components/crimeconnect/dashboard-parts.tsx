import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { StatusBadge } from "./status-badge";

export function MetricCard({label,value,detail,icon:Icon,tone="primary"}:{label:string;value:string;detail:string;icon:LucideIcon;tone?:"primary"|"success"|"alert"}) { return <article className="rounded-lg border border-border bg-card p-5"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-extrabold">{value}</p></div><span className={`grid size-10 place-items-center rounded-lg ${tone==="success"?"bg-success/15 text-success":tone==="alert"?"bg-destructive/15 text-destructive":"bg-primary/15 text-primary"}`}><Icon/></span></div><p className="mt-4 flex items-center gap-1 text-xs text-muted-foreground"><ArrowUpRight className="size-3"/>{detail}</p></article>; }

export const demoReports=[
 {id:"CC-DYPC-1042",type:"Suspicious activity",location:"Main Gate",date:"22 Sep 2026",status:"Under Review"},
 {id:"CC-DYPC-1038",type:"Lost property",location:"Library Block",date:"21 Sep 2026",status:"Resolved"},
 {id:"CC-DYPC-1031",type:"Safety hazard",location:"Workshop Wing",date:"20 Sep 2026",status:"Referred to Authorities"},
];
export function ReportsTable(){return <div className="overflow-x-auto rounded-lg border border-border"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-secondary/70 text-xs uppercase text-muted-foreground"><tr>{["Report ID","Type","Location","Date","Status"].map(h=><th key={h} className="px-5 py-4">{h}</th>)}</tr></thead><tbody>{demoReports.map(r=><tr key={r.id} className="border-t border-border bg-card"><td className="px-5 py-4 font-bold text-primary">{r.id}</td><td className="px-5 py-4">{r.type}</td><td className="px-5 py-4 text-muted-foreground">{r.location}</td><td className="px-5 py-4 text-muted-foreground">{r.date}</td><td className="px-5 py-4"><StatusBadge status={r.status}/></td></tr>)}</tbody></table></div>}