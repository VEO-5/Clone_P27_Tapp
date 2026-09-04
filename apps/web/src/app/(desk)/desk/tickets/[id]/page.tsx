"use client";

import { use } from "react";

import { ReplyScreen } from "@/features/desk/ReplyScreen";

export default function DeskTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ReplyScreen id={id} />;
}
