

// One-time demo seeding. Removed after use.
export async function seedDemo() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: inst } = await supabaseAdmin.from("institutions").select("id").ilike("name", "D. Y. Patil%").limit(1).single();
  const accounts = [
    { email: "user@crimeconnect.demo", name: "Demo Student (User)", role: "user" as const },
    { email: "security@crimeconnect.demo", name: "Demo Security Officer", role: "security_officer" as const },
    { email: "principal@crimeconnect.demo", name: "Demo Principal", role: "principal" as const },
  ];
  const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
  const ids: Record<string, string> = {};
  for (const a of accounts) {
    let id = list?.users.find((u) => u.email === a.email)?.id;
    if (!id) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({ email: a.email, password: "CrimeDemo@2026", email_confirm: true, user_metadata: { display_name: a.name } });
      if (error) throw new Error(error.message);
      id = data.user.id;
    }
    ids[a.role] = id;
    await supabaseAdmin.from("profiles").upsert({ id, display_name: a.name, institution_id: inst?.id ?? null });
    const roles = a.role === "user" ? ["user"] : ["user", a.role];
    for (const r of roles) {
      const { data: ex } = await supabaseAdmin.from("user_roles").select("id").eq("user_id", id).eq("role", r as "user").maybeSingle();
      if (!ex) await supabaseAdmin.from("user_roles").insert({ user_id: id, role: r as "user" });
    }
  }
  const { count } = await supabaseAdmin.from("incidents").select("id", { count: "exact", head: true }).eq("reporter_id", ids["user"]!);
  if (!count) {
    const base = { reporter_id: ids["user"]!, institution_id: inst?.id ?? null, is_demo: true, latitude: 16.7049, longitude: 74.2433 };
    const samples = [
      { incident_type: "Suspicious Activity (Demo)", category: "Suspicious Activity", description: "Fictional demo: unknown person loitering near the main gate after hours.", landmark: "Main Gate (Demo)", status: "submitted" as const },
      { incident_type: "Lost Laptop Bag (Demo)", category: "Theft", description: "Fictional demo: laptop bag reported missing from the library reading hall.", landmark: "Library Block (Demo)", status: "under_review" as const, latitude: 16.7052, longitude: 74.2440 },
      { incident_type: "Broken Street Light (Demo)", category: "Vandalism", description: "Fictional demo: street light damaged near the parking area, creating a safety hazard.", landmark: "Parking Area (Demo)", status: "verified" as const, latitude: 16.7044, longitude: 74.2428, security_review_note: "Checked on site. Maintenance informed." },
      { incident_type: "Harassment Complaint (Demo)", category: "Harassment", description: "Fictional demo: verbal harassment complaint near the canteen, handled by staff.", landmark: "Canteen (Demo)", status: "resolved" as const, latitude: 16.7047, longitude: 74.2437, security_review_note: "Counselling done. Case closed.", resolved_at: new Date().toISOString() },
    ];
    for (const s of samples) {
      const { data: row } = await supabaseAdmin.from("incidents").insert({ ...base, ...s, occurred_at: new Date().toISOString() }).select("id,status").single();
      if (row && s.status !== "submitted") await supabaseAdmin.from("incidents").update({ status: s.status }).eq("id", row.id);
    }
  }
  return { ok: true };
}
