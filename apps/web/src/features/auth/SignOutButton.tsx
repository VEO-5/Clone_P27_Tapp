"use client";

import { LogOut } from "lucide-react";

import { Button } from "@/components/shadcn/button";

import { useSignOut } from "./useSession";

export function SignOutButton() {
  const signOut = useSignOut();
  return (
    <Button variant="ghost" size="sm" onClick={() => void signOut()}>
      <LogOut className="size-3.5" aria-hidden />
      Sign out
    </Button>
  );
}