export type IncidentStatus = "submitted" | "under_review" | "verified" | "unverified" | "needs_evidence" | "referred" | "resolved";
export type Incident = {
  id: string; report_id: string; incident_type: string; category: string; description: string; landmark: string;
  address: string | null; latitude: number; longitude: number; status: IncidentStatus; created_at: string; occurred_at: string;
  reporter_role: string; acknowledged_at: string | null; is_demo: boolean; security_review_note: string | null;
  reviewed_at: string | null; resolved_at: string | null; incident_photos?: { id: string }[]; ai_assessment?: unknown; alert_level: AlertLevel;
};
export const INCIDENT_COLS =
  "id,report_id,incident_type,category,description,landmark,address,latitude,longitude,status,created_at,occurred_at,reporter_role,acknowledged_at,is_demo,security_review_note,reviewed_at,resolved_at,ai_assessment,alert_level,incident_photos(id)";
export const STATUS_LABEL: Record<IncidentStatus, string> = {
  submitted: "New", under_review: "Under Review", verified: "Verified", unverified: "Unverified", needs_evidence: "More Evidence Requested", referred: "Referred to Authorities", resolved: "Resolved",
};

export function homeFor(roles: string[]): "/principal-dashboard" | "/security-dashboard" | "/user-dashboard" {
  if (roles.includes("principal")) return "/principal-dashboard";
  if (roles.includes("security_officer")) return "/security-dashboard";
  return "/user-dashboard";
}

export function beep() {
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

export type AlertLevel = "high" | "medium" | "low";
export const ALERT_META: Record<AlertLevel, { label: string; emoji: string; hint: string; badge: string; selected: string; rank: number }> = {
  high: { label: "HIGH ALERT", emoji: "🔴", hint: "For incidents requiring immediate attention.", badge: "border-destructive bg-destructive text-destructive-foreground", selected: "border-destructive bg-destructive/15", rank: 0 },
  medium: { label: "MEDIUM ALERT", emoji: "🟠", hint: "For incidents requiring attention but not immediately critical.", badge: "border-orange-400/60 bg-orange-500/15 text-orange-300", selected: "border-orange-400 bg-orange-500/15", rank: 1 },
  low: { label: "LOW ALERT", emoji: "🟢", hint: "For minor incidents that can be reviewed normally.", badge: "border-success/40 bg-success/10 text-success", selected: "border-success bg-success/15", rank: 2 },
};
/** Open (unresolved) HIGH alerts first, then newest. */
export function byPriority(a: Incident, b: Incident) {
  const open = (i: Incident) => (i.status === "resolved" ? 1 : 0);
  return open(a) - open(b) || ALERT_META[a.alert_level ?? "low"].rank - ALERT_META[b.alert_level ?? "low"].rank || b.created_at.localeCompare(a.created_at);
}
