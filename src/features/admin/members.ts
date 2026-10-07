/**
 * Desk directory member (agents/admins tables + invite dialogs).
 * Shape matches the live `/admin/agents` + `/admin/admins` API responses.
 */
export interface AdminMember {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  teamId: string | null;
  status: "active" | "invited" | "deactivated";
  openTickets: number;
  lastSeen: string | null;
}
