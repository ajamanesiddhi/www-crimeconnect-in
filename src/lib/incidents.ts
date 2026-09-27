export type IncidentStatus = "submitted" | "under_review" | "verified" | "referred" | "resolved";
export type Incident = {
  id: string; report_id: string; incident_type: string; category: string; description: string; landmark: string;
  address: string | null; latitude: number; longitude: number; status: IncidentStatus; created_at: string; occurred_at: string;
  reporter_role: string; acknowledged_at: string | null; is_demo: boolean; security_review_note: string | null;
  reviewed_at: string | null; resolved_at: string | null; incident_photos?: { id: string }[];
};
export const INCIDENT_COLS =
  "id,report_id,incident_type,category,description,landmark,address,latitude,longitude,status,created_at,occurred_at,reporter_role,acknowledged_at,is_demo,security_review_note,reviewed_at,resolved_at,incident_photos(id)";
export const STATUS_LABEL: Record<IncidentStatus, string> = {
  submitted: "New", under_review: "Under Review", verified: "Verified", referred: "Referred to Authorities", resolved: "Resolved",
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
