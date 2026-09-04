import { TicketForm } from "@/components/TicketForm";

export const metadata = { title: "Report an issue" };

export default function NewTicketPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-8 pt-10 sm:px-6 sm:pt-14">
      <TicketForm />
    </div>
  );
}
