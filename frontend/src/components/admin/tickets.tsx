"use client";

import { useState } from "react";
import { TICKET_CATEGORIES, api, type Ticket, type TicketStatus, type TicketSummary } from "@/lib/api";
import { useData } from "@/lib/use-data";
import { TicketThread, ticketBadge } from "../support/thread";
import { Alert, Button, Card, Drawer, Empty, StatusBadge, cx, formatDate, useAction } from "../ui";
import { ROLE_LABELS } from "./types";

const FILTERS: [TicketStatus | "", string][] = [["OPEN", "بانتظار الرد"], ["ANSWERED", "تم الرد"], ["CLOSED", "مغلقة"], ["", "الكل"]];

function AdminTicketDrawer({ id, onChanged, onClose }: { id: number; onChanged: () => void; onClose: () => void }) {
  const { data: ticket, error, reload } = useData<Ticket>(`/admin/tickets/${id}`);
  const action = useAction();
  const changed = () => { reload(); onChanged(); };
  const setStatus = (status: TicketStatus) => action.run(() => api(`/admin/tickets/${id}/status`, { method: "PATCH", body: { status } })).then((ok) => ok && changed());

  return (
    <Drawer title={ticket?.subject ?? "التذكرة"} onClose={onClose}>
      <Alert>{error || action.error}</Alert>
      {!ticket && !error && <p className="text-sm text-subtle">جارٍ التحميل...</p>}
      {ticket && (
        <>
          {ticket.author && (
            <div className="rounded-xl bg-muted p-4 text-sm">
              <p className="font-semibold">{ticket.author.name} <span className="font-normal text-subtle">· {ROLE_LABELS[ticket.author.role]}</span></p>
              <p className="text-subtle" dir="ltr">{ticket.author.email}</p>
            </div>
          )}
          <TicketThread ticket={ticket} staffView onReply={(body) => api(`/admin/tickets/${id}/messages`, { method: "POST", body: { body } }).then(changed)} />
          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            {ticket.status === "CLOSED"
              ? <Button variant="secondary" disabled={action.busy} onClick={() => setStatus("OPEN")}>إعادة فتح التذكرة</Button>
              : <Button variant="secondary" disabled={action.busy} onClick={() => setStatus("CLOSED")}>إغلاق التذكرة</Button>}
          </div>
        </>
      )}
    </Drawer>
  );
}

export function AdminTickets() {
  const [status, setStatus] = useState<TicketStatus | "">("OPEN");
  const tickets = useData<TicketSummary[]>(`/admin/tickets${status ? `?status=${status}` : ""}`);
  const [selected, setSelected] = useState<number | null>(null);
  // Oldest first while waiting on us, so nobody is left behind.
  const list = [...(tickets.data ?? [])].sort((a, b) => (status === "OPEN" ? a.updatedAt.localeCompare(b.updatedAt) : b.updatedAt.localeCompare(a.updatedAt)));

  return (
    <>
      <Card title="تذاكر الدعم" description="مشكلات تقنية واستفسارات يرسلها الطلاب والجهات. الرد يعيد التذكرة إلى صاحبها، ورده يعيدها إلى هذه القائمة.">
        <div role="tablist" className="flex flex-wrap gap-1 rounded-xl bg-muted p-1 text-sm">
          {FILTERS.map(([key, label]) => (
            <button key={key} role="tab" aria-selected={status === key} onClick={() => setStatus(key)} className={cx("rounded-lg px-3 py-1.5", status === key && "bg-surface font-semibold shadow-sm")}>{label}</button>
          ))}
        </div>
      </Card>
      <Card>
        <Alert>{tickets.error}</Alert>
        {tickets.data?.length === 0 && <Empty>لا توجد تذاكر هنا.</Empty>}
        <ul className="divide-y divide-line">
          {list.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-medium">{t.subject}<StatusBadge status={ticketBadge(t.status)} /></p>
                <p className="text-xs text-subtle">
                  #{t.id} · {TICKET_CATEGORIES[t.category]} · {t.author?.name}{t.author && ` (${ROLE_LABELS[t.author.role]})`} · آخر تحديث {formatDate(t.updatedAt)} · {t._count.messages} رسائل
                </p>
              </div>
              <Button variant={t.status === "OPEN" ? "primary" : "secondary"} onClick={() => setSelected(t.id)}>{t.status === "OPEN" ? "الرد" : "عرض"}</Button>
            </li>
          ))}
        </ul>
      </Card>
      {selected !== null && <AdminTicketDrawer id={selected} onChanged={tickets.reload} onClose={() => setSelected(null)} />}
    </>
  );
}
