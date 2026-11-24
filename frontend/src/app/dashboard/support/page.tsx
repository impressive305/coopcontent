"use client";

import { TicketAuthorOnly } from "@/components/dashboard/role-only";
import { SupportTickets } from "@/components/support/tickets";

export default function Page() {
  return (
    <TicketAuthorOnly>
      <SupportTickets />
    </TicketAuthorOnly>
  );
}
