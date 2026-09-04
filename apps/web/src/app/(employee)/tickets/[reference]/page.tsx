"use client";

import { TicketDetail } from "@/features/tickets/TicketDetail";

export default function TicketReferencePage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  return <TicketReferenceInner params={params} />;
}

import { use } from "react";

function TicketReferenceInner({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = use(params);
  return <TicketDetail reference={reference} />;
}
