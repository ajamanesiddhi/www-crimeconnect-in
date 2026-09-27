import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { INCIDENT_COLS, type Incident } from "./incidents";
import type { Notif } from "@/components/crimeconnect/notifications-panel";

/** Loads incidents visible to the signed-in user (RLS-scoped) + their notifications, with realtime updates. */
export function useLiveIncidents(userId: string, onNew?: (n: Notif, inc: Incident | null) => void) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const cb = useRef(onNew);
  cb.current = onNew;

  const load = useCallback(async () => {
    const [{ data: inc }, { data: ns }] = await Promise.all([
      supabase.from("incidents").select(INCIDENT_COLS).order("created_at", { ascending: false }).limit(100),
      supabase.from("notifications").select("id,title,message,is_read,created_at,incident_id").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    ]);
    setIncidents((inc as unknown as Incident[]) ?? []);
    setNotifs((ns as Notif[]) ?? []);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase.channel(`live-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, async (payload) => {
        const n = payload.new as Notif;
        setNotifs((l) => [n, ...l]);
        let inc: Incident | null = null;
        if (n.incident_id) {
          const { data } = await supabase.from("incidents").select(INCIDENT_COLS).eq("id", n.incident_id).maybeSingle();
          inc = (data as unknown as Incident) ?? null;
          if (inc) setIncidents((l) => [inc!, ...l.filter((x) => x.id !== inc!.id)]);
        }
        cb.current?.(n, inc);
      }).subscribe();
    const poll = setInterval(load, 20000); // keeps statuses fresh (e.g. officer updates)
    return () => { supabase.removeChannel(ch); clearInterval(poll); };
  }, [userId, load]);

  async function markRead(id?: string) {
    const q = supabase.from("notifications").update({ is_read: true }).eq("user_id", userId);
    await (id ? q.eq("id", id) : q.eq("is_read", false));
    setNotifs((l) => l.map((n) => (!id || n.id === id ? { ...n, is_read: true } : n)));
  }

  return { incidents, notifs, reload: load, markRead, unread: notifs.filter((n) => !n.is_read).length };
}
