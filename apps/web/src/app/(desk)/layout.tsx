import { RoleGate } from "@/features/auth/RoleGate";

/** Desk group: agents and admins only. */
export default function DeskLayout({ children }: { children: React.ReactNode }) {
  return <RoleGate allow={["agent", "admin"]}>{children}</RoleGate>;
}
