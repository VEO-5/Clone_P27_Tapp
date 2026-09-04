import { RoleGate } from "@/features/auth/RoleGate";

/** Employee group: any signed-in role (employees, agents, admins). */
export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return <RoleGate allow={["employee", "agent", "admin"]}>{children}</RoleGate>;
}
