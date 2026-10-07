import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Camera, Check, CheckCircle2, ImagePlus, LocateFixed, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { DashboardShell } from "@/components/crimeconnect/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/image-compress";
import { assessIncident } from "@/lib/assessment.functions";
import { ALERT_META, type AlertLevel } from "@/lib/incidents";

const LocationMap = lazy(() => import("@/components/crimeconnect/location-map"));

export const Route = createFileRoute("/_authenticated/report")({
  head: () => ({ meta: [{ title: "Report an Incident — CrimeConnect" }, { name: "description", content: "Camera-first incident reporting with alert level and GPS location." }, { property: "og:title", content: "CrimeConnect Incident Report" }, { property: "og:description", content: "Capture, describe, locate and submit an incident in seconds." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

async function reverseGeocode(lat: number, lng: number) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, { headers: { Accept: "application/json" } });
    const j = await r.json();
    return (j?.display_name as string) ?? "";
  } catch { return ""; }
}

type Photo = { file: File; url: string; status: "ready" | "uploading" | "uploaded" | "failed" };

function StepCard({ n, title, done, active, children }: { n: number; title: string; done: boolean; active: boolean; children: React.ReactNode }) {
  return (
    <section className={`rounded-lg border p-4 sm:p-6 ${active ? "border-primary bg-card" : done ? "border-success/40 bg-card" : "border-border bg-card/50 opacity-60"}`}>
      <h2 className="flex items-center gap-3 text-lg font-bold">
        <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm ${done ? "bg-success text-background" : "bg-primary text-primary-foreground"}`}>{done ? <Check className="size-4" /> : n}</span>
        {title}
      </h2>
      {(active || done) && <div className="mt-4">{children}</div>}
    </section>
  );
}

function Page() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pending, setPending] = useState<Photo | null>(null); // captured, awaiting Retake / Use Photo
  const [description, setDescription] = useState("");
  const [alertLevel, setAlertLevel] = useState<AlertLevel | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [capturedAt, setCapturedAt] = useState<string | null>(null);
  const [locStatus, setLocStatus] = useState<"" | "ok" | "denied" | "busy">("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{ id: string; at: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const assess = useServerFn(assessIncident);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { photos.forEach((p) => URL.revokeObjectURL(p.url)); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function prepare(f?: File): Promise<Photo | null> {
    if (!f) return null;
    if (!f.type.startsWith("image/") || f.size > 15 * 1024 * 1024) { setMessage("Please capture a JPG, PNG or WebP photo."); return null; }
    const c = await compressImage(f);
    if (c.size > 5 * 1024 * 1024) { setMessage("Photo is larger than 5 MB after compression."); return null; }
    setMessage("");
    return { file: c, url: URL.createObjectURL(c), status: "ready" };
  }
  async function onCapture(f?: File) { const p = await prepare(f); if (p) { if (pending) URL.revokeObjectURL(pending.url); setPending(p); } }
  function retake() { if (pending) URL.revokeObjectURL(pending.url); setPending(null); cameraRef.current?.click(); }
  function usePhoto() { if (pending && photos.length < 5) setPhotos((l) => [...l, pending]); setPending(null); }
  async function onGallery(list: FileList | null) {
    for (const f of Array.from(list ?? [])) { const p = await prepare(f); if (p) setPhotos((l) => (l.length >= 5 ? l : [...l, p])); }
  }
  function removePhoto(i: number) { setPhotos((l) => { URL.revokeObjectURL(l[i]!.url); return l.filter((_, j) => j !== i); }); }

  async function setPoint(la: number, ln: number, fromGps = false) {
    setLat(Number(la.toFixed(6))); setLng(Number(ln.toFixed(6))); setCapturedAt(new Date().toISOString());
    if (fromGps) setLocStatus("ok");
    const a = await reverseGeocode(la, ln);
    if (a) { setAddress(a); setLandmark(a.split(",").slice(0, 3).join(",")); }
  }
  function locate() {
    if (!navigator.geolocation) { setLocStatus("denied"); return; }
    setLocStatus("busy");
    navigator.geolocation.getCurrentPosition((p) => setPoint(p.coords.latitude, p.coords.longitude, true), () => { setLocStatus("denied"); if (lat === null) { setLat(16.7049); setLng(74.2433); } }, { enableHighAccuracy: true, timeout: 15000 });
  }

  const hasPhoto = photos.length > 0;
  const hasDesc = description.trim().length >= 5;
  const hasLoc = lat !== null && lng !== null;
  const step = !hasPhoto ? 1 : !hasDesc ? 3 : !alertLevel ? 4 : !hasLoc ? 5 : 6;

  async function submit() {
    if (!hasPhoto || !hasDesc || !alertLevel || !hasLoc) { setMessage("Please capture a photo, add a short description, choose an alert level and set the location."); return; }
    setBusy(true); setMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage("Your session expired. Please sign in again."); setBusy(false); return; }
    const { data: profile } = await supabase.from("profiles").select("institution_id").eq("id", user.id).maybeSingle();
    const desc = description.trim().slice(0, 150);
    const { data: incident, error } = await supabase.from("incidents").insert({
      reporter_id: user.id, institution_id: profile?.institution_id ?? null, incident_type: desc.length > 60 ? desc.slice(0, 57) + "…" : desc,
      category: "Other", description: desc, alert_level: alertLevel, occurred_at: new Date().toISOString(),
      landmark: landmark.trim() || "Location from map", address: address || null, latitude: lat!, longitude: lng!,
      location_captured_at: capturedAt, is_demo: true, status: "submitted",
    }).select("id,report_id").single();
    if (error || !incident) { setMessage(error?.message ?? "The report could not be submitted."); setBusy(false); return; }
    let failed = 0;
    for (let k = 0; k < photos.length; k++) {
      const f = photos[k]!.file;
      setPhotos((l) => l.map((p, j) => (j === k ? { ...p, status: "uploading" } : p)));
      const path = `${user.id}/${incident.id}/${crypto.randomUUID()}.${f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg"}`;
      const up = await supabase.storage.from("incident-evidence").upload(path, f, { contentType: f.type, upsert: false });
      if (!up.error) await supabase.from("incident_photos").insert({ incident_id: incident.id, uploader_id: user.id, storage_path: path, mime_type: f.type, size_bytes: f.size });
      else failed++;
      setPhotos((l) => l.map((p, j) => (j === k ? { ...p, status: up.error ? "failed" : "uploaded" } : p)));
    }
    if (failed) setMessage(`Report saved, but ${failed} photo(s) could not be uploaded.`);
    assess({ data: { incidentId: incident.id } }).catch(() => {});
    setResult({ id: incident.report_id, at: new Date().toLocaleString() }); setBusy(false);
  }

  if (result) return (
    <DashboardShell role="user" title="Report Submitted" subtitle="College demonstration record">
      <div className="mx-auto max-w-xl rounded-lg border border-success/40 bg-success/10 p-8 text-center">
        <CheckCircle2 className="mx-auto size-14 text-success" />
        <h2 className="mt-5 text-2xl font-extrabold">Incident reported successfully.</h2>
        <p className="mt-3 text-muted-foreground">Your incident has been submitted and is awaiting authorized review.</p>
        <p className="mt-5 rounded-md bg-background p-4 font-display text-2xl font-bold text-primary">{result.id}</p>
        <dl className="mt-4 grid gap-2 text-left text-sm">
          <div><dt className="inline text-muted-foreground">Alert level: </dt><dd className="inline font-bold">{alertLevel && ALERT_META[alertLevel].label}</dd></div>
          <div><dt className="inline text-muted-foreground">Date/time: </dt><dd className="inline font-semibold">{result.at}</dd></div>
          <div><dt className="inline text-muted-foreground">Location: </dt><dd className="inline font-semibold">{landmark || `${lat}, ${lng}`}</dd></div>
          <div><dt className="inline text-muted-foreground">Current status: </dt><dd className="inline font-semibold">New</dd></div>
        </dl>
        {message && <p className="mt-3 text-sm">{message}</p>}
        <Button asChild size="lg" className="mt-6"><Link to="/user-dashboard" search={{ view: "reports" }}>Return to Dashboard</Link></Button>
      </div>
    </DashboardShell>
  );

  return (
    <DashboardShell role="user" title="Report an Incident" subtitle="Camera first • College demonstration">
      <div className="mx-auto grid max-w-2xl gap-4">
        <StepCard n={1} title="Open Camera & Capture Live Incident Photo" done={hasPhoto && !pending} active={step === 1 || !!pending}>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { onCapture(e.target.files?.[0]); e.target.value = ""; }} />
          {pending ? (
            <div>
              <img src={pending.url} alt="Captured incident photo preview" className="mx-auto max-h-80 rounded-md object-contain" />
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Button size="lg" variant="glass" className="h-14 text-base" onClick={retake}><RotateCcw />Retake</Button>
                <Button size="lg" className="h-14 text-base" onClick={usePhoto}><Check />Use Photo</Button>
              </div>
            </div>
          ) : (
            <>
              {photos.length > 0 && (
                <div className="mb-4 grid grid-cols-3 gap-2">
                  {photos.map((p, i) => (
                    <div key={p.url} className="overflow-hidden rounded-md border border-border bg-secondary">
                      <img src={p.url} alt={`Incident photo ${i + 1}`} className="h-24 w-full object-cover" />
                      <div className="flex items-center justify-between p-1.5 text-[11px]">
                        <span className={p.status === "failed" ? "text-destructive" : p.status === "uploaded" ? "text-success" : "text-muted-foreground"}>{p.status === "ready" ? "Ready" : p.status === "uploading" ? "Uploading…" : p.status === "uploaded" ? "✓ Uploaded" : "Failed"}</span>
                        <button type="button" onClick={() => removePhoto(i)} disabled={busy} aria-label={`Remove photo ${i + 1}`} className="text-destructive"><Trash2 className="size-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {photos.length < 5 && (
                <Button size="lg" className="h-20 w-full text-lg font-extrabold" onClick={() => cameraRef.current?.click()}><Camera className="size-7" />{photos.length ? "CAPTURE ANOTHER PHOTO" : "OPEN CAMERA"}</Button>
              )}
              <p className="mt-2 text-xs text-muted-foreground">{photos.length}/5 photos • Opens your phone's camera to capture a new photo.</p>
              {photos.length < 5 && <label className="mt-3 inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-muted-foreground underline"><ImagePlus className="size-4" />Camera unavailable? Upload from device instead<input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { onGallery(e.target.files); e.target.value = ""; }} /></label>}
            </>
          )}
        </StepCard>

        <StepCard n={3} title="Short Description" done={hasDesc && step > 3} active={step >= 3 && hasPhoto && !pending}>
          <Label htmlFor="desc" className="sr-only">Short Description</Label>
          <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value.slice(0, 150))} maxLength={150} className="h-14 text-base" placeholder="Briefly describe what happened..." />
          <p className="mt-1 text-right text-xs text-muted-foreground">{description.length}/150</p>
        </StepCard>

        <StepCard n={4} title="Select Alert Level" done={!!alertLevel && step > 4} active={step >= 4}>
          <div className="grid gap-3">
            {(["high", "medium", "low"] as const).map((lvl) => {
              const m = ALERT_META[lvl];
              return (
                <button key={lvl} type="button" onClick={() => setAlertLevel(lvl)} aria-pressed={alertLevel === lvl}
                  className={`flex items-center gap-3 rounded-lg border-2 p-4 text-left ${alertLevel === lvl ? m.selected : "border-border"}`}>
                  <span className="text-2xl" aria-hidden>{m.emoji}</span>
                  <span><strong className="block text-base">{m.label}</strong><span className="text-sm text-muted-foreground">{m.hint}</span></span>
                  {alertLevel === lvl && <Check className="ml-auto size-5" />}
                </button>
              );
            })}
          </div>
        </StepCard>

        <StepCard n={5} title="Location" done={hasLoc && step > 5} active={step >= 5}>
          <Button type="button" size="lg" className="h-14 w-full text-base" onClick={locate} disabled={locStatus === "busy"}><LocateFixed />{locStatus === "busy" ? "Getting location…" : "Get Current Location"}</Button>
          {locStatus === "ok" && <p className="mt-3 font-semibold text-success">✓ Location captured successfully</p>}
          {locStatus === "denied" && <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">Location permission was denied. You can select the incident location manually on the map.</p>}
          {hasLoc && <>
            <div className="mt-4 overflow-hidden rounded-lg border border-border">
              <Suspense fallback={<div className="grid h-[240px] place-items-center text-sm text-muted-foreground">Loading map…</div>}>
                <LocationMap lat={lat!} lng={lng!} height={240} onPick={(a, b) => setPoint(a, b)} />
              </Suspense>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Tap the map to correct the location • {lat}, {lng}</p>
            {address && <p className="mt-1 text-sm"><strong>Address:</strong> {address}</p>}
            <Input value={landmark} onChange={(e) => setLandmark(e.target.value)} maxLength={240} className="mt-3 h-12" placeholder="Landmark (optional), e.g. CSE lab, 2nd floor" />
          </>}
        </StepCard>

        <StepCard n={6} title="Submit Report" done={false} active={step === 6}>
          <div className="flex gap-3 rounded-md border border-primary/30 bg-primary/10 p-3 text-sm"><ShieldCheck className="size-5 shrink-0 text-primary" /><p>Sent privately to the Principal and Security Officers. Not an emergency service — call 112 in immediate danger.</p></div>
          <Button size="lg" className="mt-4 h-16 w-full text-lg font-extrabold" disabled={busy} onClick={submit}>{busy ? "Submitting…" : "SUBMIT INCIDENT REPORT"}</Button>
        </StepCard>

        {message && <p className="rounded-md border border-border bg-secondary p-3 text-sm">{message}</p>}
      </div>
    </DashboardShell>
  );
}
