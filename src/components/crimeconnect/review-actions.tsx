import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { STATUS_LABEL, type Incident, type IncidentStatus } from "@/lib/incidents";
import { toast } from "sonner";

export function ReviewActions({ inc, userId, allowResolve, onChanged }: { inc: Incident; userId: string; allowResolve?: boolean; onChanged: (i: Incident) => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function update(status: IncidentStatus | null) {
    setBusy(true);
    const now = new Date().toISOString();
    const patch: Database["public"]["Tables"]["incidents"]["Update"] = { reviewed_by: userId, reviewed_at: now };
    if (note.trim()) patch.security_review_note = note.trim().slice(0, 2000);
    if (status) patch.status = status;
    if (status === "resolved") patch.resolved_at = now;
    const { error } = await supabase.from("incidents").update(patch).eq("id", inc.id);
    if (error) { toast.error(error.message); setBusy(false); return; }
    await supabase.from("incident_reviews").insert({ incident_id: inc.id, reviewer_id: userId, previous_status: inc.status, new_status: status ?? inc.status, notes: note.trim() || `Status changed to ${STATUS_LABEL[status ?? inc.status]}.` });
    toast.success(status ? `Marked as ${STATUS_LABEL[status]}` : "Investigation note saved");
    onChanged({ ...inc, status: status ?? inc.status, security_review_note: note.trim() || inc.security_review_note, reviewed_at: now });
    setNote(""); setBusy(false);
  }

  return (
    <div>
      <label htmlFor="note" className="text-sm font-bold">Investigation note</label>
      <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} className="mt-2 min-h-24 w-full rounded-md border border-input bg-transparent p-3 text-sm" placeholder="Observations, actions taken, evidence requested…" />
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Button size="lg" variant="glass" disabled={busy || !note.trim()} onClick={() => update(null)}>Save Note</Button>
        <Button size="lg" disabled={busy || inc.status === "under_review"} onClick={() => update("under_review")}>Start Investigation</Button>
        <Button size="lg" variant="glass" disabled={busy || inc.status === "needs_evidence"} onClick={() => update("needs_evidence")}>Request More Evidence</Button>
        <Button size="lg" className="bg-success text-background hover:bg-success/90" disabled={busy || inc.status === "verified"} onClick={() => update("verified")}>Mark as Verified</Button>
        <Button size="lg" variant="destructive" disabled={busy || inc.status === "unverified"} onClick={() => update("unverified")}>Mark as Unverified</Button>
        {allowResolve && <Button size="lg" variant="premium" disabled={busy || inc.status === "resolved" || inc.status === "submitted"} onClick={() => update("resolved")}>Mark Resolved</Button>}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Decisions are made by authorized personnel only — the AI never changes a report's status.</p>
    </div>
  );
}
