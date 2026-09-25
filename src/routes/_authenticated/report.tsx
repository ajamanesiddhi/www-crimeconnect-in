import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { Camera, CheckCircle2, ChevronLeft, ChevronRight, ImagePlus, LocateFixed, ShieldCheck, Trash2 } from "lucide-react";
import { DashboardShell } from "@/components/crimeconnect/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/image-compress";

const LocationMap = lazy(() => import("@/components/crimeconnect/location-map"));
const CATEGORIES = ["Theft", "Harassment", "Suspicious Activity", "Vandalism", "Assault", "Cyber Crime", "Other"];

export const Route = createFileRoute("/_authenticated/report")({
  head: () => ({ meta: [{ title: "Report an Incident — CrimeConnect" }, { name: "description", content: "Submit a private demo incident with camera evidence and GPS location." }, { property: "og:title", content: "CrimeConnect Incident Report" }, { property: "og:description", content: "A secure four-step incident reporting workflow." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

async function reverseGeocode(lat: number, lng: number) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, { headers: { Accept: "application/json" } });
    const j = await r.json();
    return (j?.display_name as string) ?? "";
  } catch { return ""; }
}

function Page() {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Suspicious Activity");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [lat, setLat] = useState(16.7049);
  const [lng, setLng] = useState(74.2433);
  const [address, setAddress] = useState("");
  const [capturedAt, setCapturedAt] = useState<string | null>(null);
  const [locStatus, setLocStatus] = useState<"" | "ok" | "denied" | "busy">("");
  const [landmark, setLandmark] = useState("D. Y. Patil College campus (Demo)");
  const [message, setMessage] = useState("");
  const [reportId, setReportId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function pick(f?: File) {
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type) || f.size > 15 * 1024 * 1024) { setMessage("Use a JPG, PNG, or WebP image (max 15 MB before compression)."); return; }
    const c = await compressImage(f);
    if (c.size > 5 * 1024 * 1024) { setMessage("Image is still larger than 5 MB after compression."); return; }
    setFile(c); setPreview(URL.createObjectURL(c)); setMessage("");
  }
  function removePhoto() { setFile(null); setPreview(""); }

  async function setPoint(la: number, ln: number, fromGps = false) {
    setLat(Number(la.toFixed(6))); setLng(Number(ln.toFixed(6)));
    setCapturedAt(new Date().toISOString());
    if (fromGps) setLocStatus("ok");
    const a = await reverseGeocode(la, ln);
    if (a) { setAddress(a); setLandmark(a.split(",").slice(0, 3).join(",")); }
  }
  function locate() {
    if (!navigator.geolocation) { setLocStatus("denied"); return; }
    setLocStatus("busy");
    navigator.geolocation.getCurrentPosition(
      (p) => setPoint(p.coords.latitude, p.coords.longitude, true),
      () => setLocStatus("denied"),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  function valid() {
    if (step === 1) return title.trim().length >= 2 && description.trim().length >= 20 && !!date;
    if (step === 3) return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && landmark.trim().length >= 2;
    return true;
  }

  async function submit() {
    setBusy(true); setMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage("Your session expired. Please sign in again."); setBusy(false); return; }
    const { data: profile } = await supabase.from("profiles").select("institution_id").eq("id", user.id).maybeSingle();
    const { data: incident, error } = await supabase.from("incidents").insert({
      reporter_id: user.id, institution_id: profile?.institution_id ?? null, incident_type: title.trim(), category,
      description: description.trim(), occurred_at: new Date(date).toISOString(), landmark: landmark.trim(),
      address: address || null, latitude: lat, longitude: lng, location_captured_at: capturedAt, is_demo: true, status: "submitted",
    }).select("id,report_id").single();
    if (error || !incident) { setMessage(error?.message ?? "The demo report could not be submitted."); setBusy(false); return; }
    if (file) {
      const path = `${user.id}/${incident.id}/${crypto.randomUUID()}.${file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"}`;
      const up = await supabase.storage.from("incident-evidence").upload(path, file, { contentType: file.type, upsert: false });
      if (!up.error) await supabase.from("incident_photos").insert({ incident_id: incident.id, uploader_id: user.id, storage_path: path, mime_type: file.type, size_bytes: file.size });
      else setMessage("Report saved, but the photo could not be uploaded.");
    }
    setReportId(incident.report_id); setBusy(false);
  }

  if (reportId) return (
    <DashboardShell role="user" title="Report Submitted" subtitle="College demonstration record">
      <div className="mx-auto max-w-xl rounded-lg border border-success/40 bg-success/10 p-8 text-center">
        <CheckCircle2 className="mx-auto size-14 text-success" />
        <h2 className="mt-5 text-2xl font-extrabold">Demo report submitted securely</h2>
        <p className="mt-3 text-muted-foreground">The authorized Principal has been alerted automatically.</p>
        <p className="mt-5 rounded-md bg-background p-4 font-display text-2xl font-bold text-primary">{reportId}</p>
        <p className="mt-4 text-xs text-muted-foreground">This fictional allegation is pending authorized review and is not a verified crime.</p>
        {message && <p className="mt-3 text-sm">{message}</p>}
        <Button asChild size="lg" className="mt-6"><Link to="/dashboard">Return to Dashboard</Link></Button>
      </div>
    </DashboardShell>
  );

  return (
    <DashboardShell role="user" title="Report an Incident" subtitle={`Step ${step} of 4 • College demonstration`}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-7 grid grid-cols-4 gap-2">{["Incident", "Photo", "Location", "Review"].map((x, i) => <div key={x}><div className={`h-1 rounded-full ${i < step ? "bg-primary" : "bg-secondary"}`} /><p className="mt-2 text-center text-xs font-bold text-muted-foreground">{x}</p></div>)}</div>
        <section className="rounded-lg border border-border bg-card p-4 sm:p-7">
          {step === 1 && <div className="space-y-5">
            <div><h2 className="text-xl font-bold">Incident information</h2><p className="mt-2 text-sm text-muted-foreground">Describe a fictional demonstration incident without sensitive personal data.</p></div>
            <div><Label htmlFor="title">Incident title</Label><Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2 h-12" placeholder="e.g. Suspicious activity (Demo)" maxLength={80} /></div>
            <div><Label htmlFor="cat">Category</Label><select id="cat" value={category} onChange={(e) => setCategory(e.target.value)} className="mt-2 h-12 w-full rounded-md border border-input bg-background px-3 text-sm">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div><Label htmlFor="date">Date and time</Label><Input id="date" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="mt-2 h-12" /></div>
            <div><Label htmlFor="description">Description</Label><textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-2 min-h-36 w-full rounded-md border border-input bg-transparent p-3 text-sm" placeholder="Provide at least 20 characters…" maxLength={2000} /><p className="mt-1 text-right text-xs text-muted-foreground">{description.length}/2000</p></div>
          </div>}

          {step === 2 && <div>
            <h2 className="text-xl font-bold">Capture / Upload Evidence Photo</h2>
            <p className="mt-2 rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">Evidence photo is optional. Only upload relevant information.</p>
            {preview ? (
              <div className="mt-5">
                <img src={preview} alt="Selected evidence preview" className="mx-auto max-h-72 rounded-md object-contain" />
                <p className="mt-3 flex items-center gap-2 text-sm"><Camera className="size-4 text-success" />{file?.name} • {file ? Math.round(file.size / 1024) : 0} KB</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-secondary font-semibold"><ImagePlus className="size-5" />Replace photo<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} /></label>
                  <Button type="button" variant="destructive" className="h-14 text-base" onClick={removePhoto}><Trash2 />Remove photo</Button>
                </div>
              </div>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg bg-primary font-bold text-primary-foreground"><Camera className="size-8" />Open Camera<input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} /></label>
                <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-primary/50 bg-primary/5 font-bold"><ImagePlus className="size-8 text-primary" />Choose from Gallery<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} /></label>
              </div>
            )}
            <p className="mt-4 text-xs text-muted-foreground">Photos are resized automatically and stored privately. Only you and authorized reviewers can view them.</p>
          </div>}

          {step === 3 && <div>
            <h2 className="text-xl font-bold">Confirm location</h2>
            <p className="mt-2 text-sm text-muted-foreground">Location is collected only when you tap the button — never tracked in the background. Tap the map to correct it.</p>
            <Button type="button" size="lg" className="mt-5 h-14 w-full text-base sm:w-auto" onClick={locate} disabled={locStatus === "busy"}><LocateFixed />{locStatus === "busy" ? "Getting location…" : "Get Current Location"}</Button>
            {locStatus === "ok" && <p className="mt-3 font-semibold text-success">✓ Location captured successfully</p>}
            {locStatus === "denied" && <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">Location permission was denied. You can select the incident location manually on the map.</p>}
            <div className="mt-5 overflow-hidden rounded-lg border border-border">
              <Suspense fallback={<div className="grid h-[280px] place-items-center text-sm text-muted-foreground">Loading map…</div>}>
                <LocationMap lat={lat} lng={lng} height={280} onPick={(a, b) => setPoint(a, b)} />
              </Suspense>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Coordinates: {lat}, {lng}{capturedAt ? ` • captured ${new Date(capturedAt).toLocaleTimeString()}` : ""}</p>
            {address && <p className="mt-1 text-sm"><strong>Address:</strong> {address}</p>}
            <div className="mt-4"><Label htmlFor="landmark">Landmark or campus area</Label><Input id="landmark" value={landmark} onChange={(e) => setLandmark(e.target.value)} className="mt-2 h-12" maxLength={240} /></div>
          </div>}

          {step === 4 && <div>
            <h2 className="text-xl font-bold">Review and submit</h2>
            <p className="mt-2 text-sm text-muted-foreground">Submission does not prove a crime occurred.</p>
            <dl className="mt-6 grid gap-4 text-sm">
              <div className="rounded-md bg-secondary p-4"><dt className="text-muted-foreground">Incident</dt><dd className="mt-1 font-bold">{title} • {category}</dd></div>
              <div className="rounded-md bg-secondary p-4"><dt className="text-muted-foreground">Description</dt><dd className="mt-1 leading-6">{description}</dd></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-md bg-secondary p-4"><dt className="text-muted-foreground">Evidence</dt><dd className="mt-1 font-bold">{file ? "1 private photo" : "No photo attached"}</dd></div>
                <div className="rounded-md bg-secondary p-4"><dt className="text-muted-foreground">Location</dt><dd className="mt-1 font-bold">{landmark}</dd><dd className="text-xs text-muted-foreground">{lat}, {lng}</dd></div>
              </div>
            </dl>
            <div className="mt-5 flex gap-3 rounded-md border border-primary/30 bg-primary/10 p-4 text-sm"><ShieldCheck className="size-5 shrink-0 text-primary" /><p>Only you and permitted reviewers can access this report. CrimeConnect is not an emergency service; call 112 in immediate danger.</p></div>
          </div>}

          {message && <p className="mt-5 rounded-md border border-border bg-secondary p-3 text-sm">{message}</p>}
          <div className="mt-7 flex justify-between gap-3">
            <Button variant="glass" size="lg" className="h-14" disabled={step === 1 || busy} onClick={() => setStep((s) => s - 1)}><ChevronLeft />Back</Button>
            {step < 4 ? <Button size="lg" className="h-14 flex-1 sm:flex-none" disabled={!valid()} onClick={() => setStep((s) => s + 1)}>Continue<ChevronRight /></Button>
              : <Button size="lg" className="h-14 flex-1 text-base sm:flex-none" disabled={busy} onClick={submit}>{busy ? "Submitting…" : "Submit Report"}</Button>}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
