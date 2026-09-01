import { redirect } from "next/navigation";

import { EmployeeLoginForm } from "@/components/EmployeeLoginForm";
import { LinkButton } from "@/components/ui/Button";
import { getEmployeeSession } from "@/lib/employeeAuth";

export const metadata = {
  title: "Sign in to your tickets",
};

export default async function EmployeeLoginPage() {
  if (await getEmployeeSession()) redirect("/my-tickets");

  return (
    <div className="mx-auto max-w-lg px-4 pb-8 pt-16 sm:px-6 sm:pt-24">
      <EmployeeLoginForm />
      <p className="mt-6 text-center text-[13px] text-fog">
        Have a reference instead?{" "}
        <LinkButton href="/track" variant="ghost" size="sm" className="inline h-auto px-1 py-0">
          Look up a single ticket
        </LinkButton>
      </p>
    </div>
  );
}
