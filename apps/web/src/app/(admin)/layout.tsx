import { RoleGate } from "@/features/auth/RoleGate";

/** Admin group: admins only. Agents see a 403 page. */
export default function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  return <RoleGate allow={["admin"]}>{children}</RoleGate>;
}
