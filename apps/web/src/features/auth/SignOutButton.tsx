"use client";

import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/Button";

import { useSignOut } from "./useSession";

export function SignOutButton() {
  const signOut = useSignOut();
  return (
    <Button variant="ghost" size="sm" onClick={() => void signOut()} icon={<LogOut className="size-3.5" aria-hidden />}>
      Sign out
    </Button>
  );
}
