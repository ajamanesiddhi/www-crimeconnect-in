import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Assessment = {
  level: "Low" | "Moderate" | "Strong";
  score: number;
  photos: number;
  photoConsistency: "consistent" | "inconsistent" | "not_applicable" | "unavailable";
  location: "consistent" | "needs_review" | "unavailable";
  description: "detailed" | "limited";
  timeCheck: string;
  relatedReports: { id: string; report_id: string; incident_type: string }[];
  supporting: string[];
  issues: string[];
  generatedAt: string;
  aiUsed: boolean;
};

type AiView = { photos_consistent: boolean | null; location_consistent: "consistent" | "needs_review" | "unavailable"; description_specific: boolean; supporting: string[]; issues: string[] };

async function askAi(input: { title: string; category: string; description: string; landmark: string; address: string | null; imageUrls: string[] }): Promise<AiView | null> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return null;
  const content: unknown[] = [{
    type: "input_text",
    text: `You summarise evidence for a college incident-report review tool. You must NOT judge whether the incident is true or fake, must NOT identify people, and must NOT consider faces, clothing, demographics or personal characteristics.
Report: title="${input.title}", category="${input.category}", location="${input.address || input.landmark}".
Description: """${input.description.slice(0, 2000)}"""
${input.imageUrls.length} photo(s) attached.
Return ONLY JSON: {"photos_consistent": true|false|null (null if fewer than 2 photos; true if they appear to show the same scene/incident), "location_consistent": "consistent"|"needs_review"|"unavailable" (does the location fit the description?), "description_specific": true|false (enough concrete detail—what/where/when—for review; do not judge writing style), "supporting": [short strings], "issues": [short strings]}`,
  }];
  for (const url of input.imageUrls) content.push({ type: "input_image", image_url: url });
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key, Authorization: `Bearer ${key}`, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({ model: "openai/gpt-6-astra", stream: true, store: false, reasoning: { effort: "low" }, input: [{ role: "user", content }] }),
  });
  if (!res.ok || !res.body) { console.error("AI assessment failed", res.status, await res.text().catch(() => "")); return null; }
  const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "", text = "";
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n"); buf = lines.pop() ?? "";
    for (const l of lines) {
      if (!l.startsWith("data:")) continue;
      const d = l.slice(5).trim(); if (!d || d === "[DONE]") continue;
      try { const ev = JSON.parse(d); if (ev.type === "response.output_text.delta") text += ev.delta; } catch { /* partial */ }
    }
  }
  const m = text.match(/\{[\s\S]*\}/);
  try { return m ? (JSON.parse(m[0]) as AiView) : null; } catch { return null; }
}

export const assessIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ incidentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Caller must be able to see the incident (reporter or authorized reviewer) — enforced by RLS.
    const { data: inc } = await context.supabase.from("incidents").select("id,incident_type,category,description,landmark,address,latitude,longitude,occurred_at,created_at,location_captured_at").eq("id", data.incidentId).maybeSingle();
    if (!inc) throw new Error("Incident not found");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: photos } = await supabaseAdmin.from("incident_photos").select("storage_path").eq("incident_id", inc.id).limit(5);
    const urls: string[] = [];
    for (const p of photos ?? []) {
      const { data: s } = await supabaseAdmin.storage.from("incident-evidence").createSignedUrl(p.storage_path, 300);
      if (s?.signedUrl) urls.push(s.signedUrl);
    }
    // Possible related reports: same category, within ~500 m, within 3 days.
    const since = new Date(new Date(inc.occurred_at).getTime() - 3 * 864e5).toISOString();
    const { data: near } = await supabaseAdmin.from("incidents").select("id,report_id,incident_type,category,latitude,longitude").neq("id", inc.id).gte("created_at", since).limit(200);
    const related = (near ?? []).filter((r) => Math.hypot((r.latitude - inc.latitude) * 111, (r.longitude - inc.longitude) * 111 * Math.cos((inc.latitude * Math.PI) / 180)) < 0.5 && (r.category === inc.category)).slice(0, 5).map(({ id, report_id, incident_type }) => ({ id, report_id, incident_type }));

    const ai = await askAi({ title: inc.incident_type, category: inc.category, description: inc.description, landmark: inc.landmark, address: inc.address, imageUrls: urls }).catch(() => null);

    const hasLoc = Number.isFinite(inc.latitude) && Number.isFinite(inc.longitude);
    const location: Assessment["location"] = !hasLoc ? "unavailable" : ai?.location_consistent ?? "needs_review";
    const detailed = ai ? ai.description_specific : inc.description.trim().length >= 80;
    const photoConsistency: Assessment["photoConsistency"] = urls.length < 2 ? "not_applicable" : ai ? (ai.photos_consistent === false ? "inconsistent" : ai.photos_consistent ? "consistent" : "unavailable") : "unavailable";

    let score = 10;
    score += urls.length === 0 ? 0 : urls.length === 1 ? 15 : 25;
    if (photoConsistency === "consistent") score += 10;
    if (photoConsistency === "inconsistent") score -= 10;
    score += location === "consistent" ? 20 : location === "needs_review" ? 10 : 0;
    if (inc.location_captured_at) score += 5;
    score += detailed ? 20 : 5;
    score += Math.min(related.length, 2) * 5;
    score = Math.max(0, Math.min(100, score));

    const supporting = [
      urls.length ? `${urls.length} photo${urls.length > 1 ? "s" : ""} available` : null,
      location !== "unavailable" ? "Location information available" : null,
      inc.location_captured_at ? "Device GPS captured at report time" : null,
      detailed ? "Description contains incident details" : null,
      related.length ? `${related.length} potentially related report${related.length > 1 ? "s" : ""} found` : null,
      ...(ai?.supporting ?? []),
    ].filter(Boolean).slice(0, 8) as string[];
    const issues = [
      urls.length === 0 ? "No photo evidence" : urls.length === 1 ? "Single photo — limited evidence" : null,
      photoConsistency === "inconsistent" ? "Photos may not show the same scene — needs human review" : null,
      location === "needs_review" ? "Location needs review" : null,
      !detailed ? "Description lacks specific details" : null,
      !ai ? "AI analysis unavailable — score based on basic checks only" : null,
      ...(ai?.issues ?? []),
    ].filter(Boolean).slice(0, 8) as string[];

    const assessment: Assessment = {
      level: score >= 70 ? "Strong" : score >= 40 ? "Moderate" : "Low", score, photos: urls.length, photoConsistency, location,
      description: detailed ? "detailed" : "limited",
      timeCheck: "Photo metadata not reliably available — date/time not compared.",
      relatedReports: related, supporting, issues, generatedAt: new Date().toISOString(), aiUsed: !!ai,
    };
    await supabaseAdmin.from("incidents").update({ ai_assessment: assessment as never }).eq("id", inc.id);
    return { ok: true };
  });
