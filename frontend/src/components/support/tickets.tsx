"use client";

import { useState } from "react";
import { LifeBuoy, Plus } from "lucide-react";
import { TICKET_CATEGORIES, api, type Ticket, type TicketCategory, type TicketSummary } from "@/lib/api";
import { useData } from "@/lib/use-data";
import { Alert, Button, Card, Drawer, Empty, Field, Select, StatusBadge, formValues, formatDate, useAction } from "../ui";
import { TicketThread, ticketBadge } from "./thread";

function NewTicketForm({ onCreated }: { onCreated: (t: Ticket) => void }) {
  const action = useAction();
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const v = formValues(form);
    let created: Ticket | null = null;
    await action.run(async () => {
      created = await api<Ticket>("/tickets", { method: "POST", body: { subject: v.subject, category: v.category, body: v.body } });
    });
    if (created) {
      form.reset();
      onCreated(created);
    }
  };
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_14rem]">
      <Field label="عنوان المشكلة" name="subject" required minLength={3} maxLength={150} placeholder="مثال: لا يظهر زر رفع التقرير" />
      <Select label="النوع" name="category" required defaultValue="TECHNICAL">
        {(Object.keys(TICKET_CATEGORIES) as TicketCategory[]).map((c) => <option key={c} value={c}>{TICKET_CATEGORIES[c]}</option>)}
      </Select>
      <div className="sm:col-span-2">
        <Field label="التفاصيل" name="body" textarea rows={5} required minLength={10} maxLength={5000} hint="اذكر الصفحة التي كنت فيها، وما فعلته، وما ظهر لك. لا تكتب كلمة المرور أبداً." />
      </div>
      <div className="space-y-3 sm:col-span-2">
        <Alert>{action.error}</Alert>
        <Button type="submit" disabled={action.busy}>إرسال التذكرة</Button>
      </div>
    </form>
  );
}

function TicketDrawer({ id, onChanged, onClose }: { id: number; onChanged: () => void; onClose: () => void }) {
  const { data: ticket, error, reload } = useData<Ticket>(`/tickets/${id}`);
  const action = useAction();
  const changed = () => { reload(); onChanged(); };
  const close = () => {
    if (!window.confirm("إغلاق التذكرة؟ لن تتمكن من الرد عليها بعد ذلك.")) return;
    action.run(() => api(`/tickets/${id}/close`, { method: "PATCH" })).then((ok) => ok && changed());
  };

  return (
    <Drawer title={ticket?.subject ?? "التذكرة"} onClose={onClose}>
      <Alert>{error || action.error}</Alert>
      {!ticket && !error && <p className="text-sm text-subtle">جارٍ التحميل...</p>}
      {ticket && (
        <>
          <TicketThread ticket={ticket} staffView={false} onReply={(body) => api(`/tickets/${id}/messages`, { method: "POST", body: { body } }).then(changed)} />
          {ticket.status !== "CLOSED" && (
            <div className="border-t border-line pt-4">
              <Button variant="secondary" disabled={action.busy} onClick={close}>تم حل المشكلة، أغلق التذكرة</Button>
            </div>
          )}
        </>
      )}
    </Drawer>
  );
}

export function SupportTickets() {
  const tickets = useData<TicketSummary[]>("/tickets");
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <>
      <section className="rounded-3xl bg-gradient-to-l from-teal-700 to-teal-900 p-6 text-white sm:p-8">
        <h2 className="flex items-center gap-2 text-xl font-bold"><LifeBuoy className="size-6" />الدعم الفني</h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-teal-50/90">
          واجهتك مشكلة تقنية في المنصة، أو تحتاج شرحاً لخطوة ما؟ افتح تذكرة ويرد عليك فريق إدارة المنصة هنا، وتصلك الردود في نفس التذكرة.
        </p>
      </section>

      <Card
        title={`تذاكري (${tickets.data?.length ?? 0})`}
        actions={<Button onClick={() => setAdding(!adding)}><Plus className="size-4" />{adding ? "إغلاق" : "تذكرة جديدة"}</Button>}
      >
        {adding && (
          <div className="mb-5 rounded-xl border border-line p-4">
            <NewTicketForm onCreated={(t) => { setAdding(false); tickets.reload(); setSelected(t.id); }} />
          </div>
        )}
        <Alert>{tickets.error}</Alert>
        {tickets.data?.length === 0 && !adding && <Empty>لا توجد تذاكر. إن واجهتك مشكلة، افتح تذكرة جديدة.</Empty>}
        <ul className="divide-y divide-line">
          {tickets.data?.map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => setSelected(t.id)} className="flex w-full flex-wrap items-center justify-between gap-3 py-3 text-start hover:bg-muted/50">
                <span className="min-w-0">
                  <span className="block font-medium">{t.subject}</span>
                  <span className="block text-xs text-subtle">{TICKET_CATEGORIES[t.category]} · #{t.id} · آخر تحديث {formatDate(t.updatedAt)} · {t._count.messages} رسائل</span>
                </span>
                <StatusBadge status={ticketBadge(t.status)} />
              </button>
            </li>
          ))}
        </ul>
      </Card>
      {selected !== null && <TicketDrawer id={selected} onChanged={tickets.reload} onClose={() => setSelected(null)} />}
    </>
  );
}
