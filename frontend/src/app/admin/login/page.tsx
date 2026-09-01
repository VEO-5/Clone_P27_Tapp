import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/AdminLoginForm";
import { isAuthenticated } from "@/lib/adminAuth";

export const metadata = {
  title: "Support sign in",
};

export default async function AdminLoginPage() {
  if (await isAuthenticated()) redirect("/admin");

  return (
    <div className="mx-auto max-w-lg px-4 pb-8 pt-16 sm:px-6 sm:pt-24">
      <AdminLoginForm />
    </div>
  );
}
