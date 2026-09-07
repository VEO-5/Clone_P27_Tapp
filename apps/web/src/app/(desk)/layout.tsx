import { RoleGate } from "@/features/auth/RoleGate";
import { DeskShell } from "@/features/desk/DeskShell";

/** Desk group: agents and admins only, inside the board shell. */
export default function DeskLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate allow={["agent", "admin"]}>
      <DeskShell>{children}</DeskShell>
    </RoleGate>
  );
}
