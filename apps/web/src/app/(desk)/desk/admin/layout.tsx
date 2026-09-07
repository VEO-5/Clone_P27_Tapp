import { RoleGate } from "@/features/auth/RoleGate";

/**
 * Desk admin section: admins only. Agents hitting /desk/admin/* directly get
 * the same 403 the old /admin group served. The desk sidebar (parent layout)
 * stays mounted — only the content area swaps.
 */
export default function DeskAdminLayout({ children }: { children: React.ReactNode }) {
  return <RoleGate allow={["admin"]}>{children}</RoleGate>;
}