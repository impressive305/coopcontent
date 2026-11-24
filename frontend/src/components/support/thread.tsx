"use client";

import { useState } from "react";
import { Headset, Send, UserRound } from "lucide-react";
import { TICKET_CATEGORIES, type Ticket } from "@/lib/api";
import { Alert, Button, StatusBadge, cx, formatDate, inputClass, useAction } from "../ui";

export const ticketBadge = (status: Ticket["status"]) => `TICKET_${status}`;

const formatDateTime = (d: string) =>
  new Date(d).toLocaleString("ar-SA-u-ca-gregory-nu-latn", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

// The conversation of one ticket, and a reply box while it is open.
// `staffView` is the admins' side: their own messages sit on the other side of the thread.
export function TicketThread({ ticket, staffView, onReply }: { ticket: Ticket; staffView: boolean; onReply: (body: string) => Promise<unknown> }) {
  const [body, setBody] = useState("");
  const action = useAction();
  const send = () => action.run(() => onReply(body.trim())).then((ok) => ok && setBody(""));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <StatusBadge status={ticketBadge(ticket.status)} />
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs">{TICKET_CATEGORIES[ticket.category]}</span>
        <span className="text-xs text-subtle">فُتحت في {formatDate(ticket.createdAt)} · #{ticket.id}</span>
      </div>

      <ol className="space-y-3">
        {ticket.messages.map((m) => {
          const mine = m.fromStaff === staffView;
          return (
            <li key={m.id} className={cx("flex gap-3", mine && "flex-row-reverse")}>
              <span className={cx("grid size-8 shrink-0 place-items-center rounded-full", m.fromStaff ? "bg-brand text-white" : "bg-muted text-subtle")}>
                {m.fromStaff ? <Headset className="size-4" /> : <UserRound className="size-4" />}
              </span>
              <div className={cx("max-w-[85%] rounded-2xl px-4 py-3 text-sm", m.fromStaff ? "bg-brand-soft" : "bg-muted")}>
                <p className="mb-1 text-xs font-medium text-subtle">
                  {m.fromStaff ? (staffView && m.author ? `${m.author.name} · فريق الدعم` : "فريق الدعم") : staffView ? ticket.author?.name ?? "المستخدم" : "أنت"}
                  {" · "}{formatDateTime(m.createdAt)}
                </p>
                {/* Plain text only: React escapes it, and nothing here is rendered as HTML. */}
                <p className="whitespace-pre-line break-words leading-7">{m.body}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {ticket.status === "CLOSED" ? (
        <p className="rounded-xl bg-muted p-4 text-center text-sm text-subtle">
          {staffView ? "التذكرة مغلقة. أعد فتحها للرد." : "أُغلقت هذه التذكرة. إن عادت المشكلة، افتح تذكرة جديدة."}
        </p>
      ) : (
        <div className="space-y-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">{staffView ? "الرد على المستخدم" : "أضف رداً"}</span>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={5000} className={inputClass} placeholder={staffView ? "اكتب الحل أو الخطوات بوضوح" : "اكتب تفاصيل إضافية أو ما حدث بعد تجربة الحل"} />
          </label>
          <Alert>{action.error}</Alert>
          <Button disabled={action.busy || body.trim().length < 2} onClick={send}><Send className="size-4" />إرسال</Button>
        </div>
      )}
    </div>
  );
}
