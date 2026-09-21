// @ts-nocheck
"use client";

import { useState } from "react";

import { toast } from "sonner";

import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/shadcn/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/table";
import { apiFetch } from "@/lib/api";
import { formatRelative } from "@/lib/utils";
import { recordMockDirectory, type MockAgent } from "@/mocks/fixtures";

import { CreateAdminDialog } from "./CreateAdminDialog";

const STATUS_LABEL: Record<MockAgent["status"], string> = {
  active: "Active",
  invited: "Invited",
  deactivated: "Deactivated",
};

const STATUS_BADGE: Record<MockAgent["status"], "default" | "secondary" | "outline"> = {
  active: "default",
  invited: "secondary",
  deactivated: "outline",
};

export function AdminTable({ initialAdmins }: { initialAdmins: MockAgent[] }) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [confirming, setConfirming] = useState<MockAgent | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function deactivate(admin: MockAgent) {
    try {
      const updated = await apiFetch<MockAgent>(`/admin/admins/${admin.id}`, { method: "DELETE" });
      // Journal the removal so a refresh can't resurrect the account.
      recordMockDirectory({ role: "admin", email: updated.email, name: updated.name, status: updated.status });
      setAdmins((list) => list.map((item) => (item.id === admin.id ? updated : item)));
      setConfirming(null);
      setNotice(`${admin.email} deactivated — they lost admin access immediately.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't deactivate this admin.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {notice ?? `${admins.length} admins`}
        </p>
        <CreateAdminDialog onCreated={(admin) => {
          setAdmins((list) => [admin, ...list]);
          setNotice(`Invite sent to ${admin.email} — activates on first sign-in.`);
        }} />
      </div>

      <div className="overflow-hidden rounded-lg border bg-card shadow-xs">
        <Table aria-label="Admins">
          <TableHeader>
            <TableRow>
              <TableHead>Admin</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Open tickets</TableHead>
              <TableHead>Last seen</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.map((admin) => (
              <TableRow key={admin.id}>
                <TableCell>
                  <span className="flex items-center gap-3">
                    <UserAvatar email={admin.email} name={admin.name} className="size-8" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{admin.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{admin.email}</span>
                      {admin.status === "invited" && (
                        <span className="block text-xs text-muted-foreground">Invited — activates on first sign-in</span>
                      )}
                    </span>
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE[admin.status]}>{STATUS_LABEL[admin.status]}</Badge>
                </TableCell>
                <TableCell>{admin.openTickets}</TableCell>
                <TableCell className="text-muted-foreground">{admin.lastSeen ? formatRelative(admin.lastSeen) : "—"}</TableCell>
                <TableCell className="text-right">
                  {admin.status !== "deactivated" && (
                    <Button variant="outline" size="sm" onClick={() => setConfirming(admin)}>
                      Deactivate
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={confirming !== null} onOpenChange={(open) => !open && setConfirming(null)}>
        <DialogContent>
          <DialogTitle>Deactivate {confirming?.email}?</DialogTitle>
          <DialogDescription>
            They will lose admin access immediately.
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirming(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => confirming && void deactivate(confirming)}
            >
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
