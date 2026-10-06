import { createFileRoute } from "@tanstack/react-router";
import { ManagementDashboard } from "@/features/admin/ManagementDashboard";
export const Route = createFileRoute("/desk/admin/")({
  component: function AdminDashboardRoute() {
    return <ManagementDashboard />;
  },
});
