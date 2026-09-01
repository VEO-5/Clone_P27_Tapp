"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const signOut = async () => {
    if (pending) return;
    setPending(true);
    try {
      await fetch("/api/admin/login", { method: "DELETE" });
      router.replace("/admin/login");
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      loading={pending}
      icon={<LogOut className="size-3.5" aria-hidden />}
      onClick={signOut}
    >
      Sign out
    </Button>
  );
}
