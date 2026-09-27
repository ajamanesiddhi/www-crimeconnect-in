import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export type Notif = { id: string; title: string; message: string; is_read: boolean; created_at: string; incident_id: string | null };

export function NotificationsPanel({ items, onOpen, onMarkAll }: { items: Notif[]; onOpen: (n: Notif) => void; onMarkAll: () => void }) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Notifications</h2>
        <Button variant="glass" size="sm" onClick={onMarkAll}>Mark all as read</Button>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {items.length === 0 && <p className="p-6 text-sm text-muted-foreground">No notifications yet.</p>}
        {items.map((n) => (
          <button key={n.id} onClick={() => onOpen(n)} className={`flex w-full gap-3 border-b border-border p-4 text-left last:border-0 hover:bg-accent ${n.is_read ? "opacity-70" : "border-l-4 border-l-destructive bg-destructive/5"}`}>
            <Bell className={`mt-0.5 size-5 shrink-0 ${n.is_read ? "text-muted-foreground" : "text-destructive"}`} />
            <div className="min-w-0">
              <p className={`text-sm ${n.is_read ? "font-medium" : "font-extrabold"}`}>{n.title}{!n.is_read && <span className="ml-2 rounded bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">UNREAD</span>}</p>
              <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
