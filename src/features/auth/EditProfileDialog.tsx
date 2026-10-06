"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/shadcn/dialog";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import { UserAvatar } from "@/components/UserAvatar";
import type { Profile } from "@/lib/contracts.vendored";
import { ApiError, apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query";
import { invalidateDesk } from "@/features/desk/ownership";
import { toast } from "sonner";

/**
 * Edit your own display name + photo (live mode only — mock identities are
 * fixed seeds). PATCH /auth/me persists to public.profiles, so the new
 * identity shows in the header, the queue, cards, and ticket detail.
 */
export function EditProfileDialog({
  open,
  onOpenChange,
  profile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null | undefined;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [errors, setErrors] = useState<{ name?: string; avatarUrl?: string; form?: string }>({});
  const [saving, setSaving] = useState(false);

  // Seed from the session profile each time the dialog opens.
  useEffect(() => {
    if (open) {
      setName(profile?.name ?? "");
      setPhotoUrl(profile?.avatarUrl ?? "");
      setErrors({});
    }
  }, [open, profile?.name, profile?.avatarUrl]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim().replace(/\s+/g, " ");
    const trimmedPhoto = photoUrl.trim();
    const nextErrors: typeof errors = {};
    if (trimmedName.length < 2) nextErrors.name = "Use at least 2 characters";
    else if (trimmedName.length > 60) nextErrors.name = "Keep it to 60 characters or fewer";
    if (trimmedPhoto && !/^https:\/\//.test(trimmedPhoto)) {
      nextErrors.avatarUrl = "Photo must be an https:// URL";
    } else if (trimmedPhoto.length > 500) {
      nextErrors.avatarUrl = "That URL is too long";
    }
    // No-op guard: nothing changed.
    if (
      !nextErrors.name &&
      !nextErrors.avatarUrl &&
      trimmedName === (profile?.name ?? "") &&
      trimmedPhoto === (profile?.avatarUrl ?? "")
    ) {
      onOpenChange(false);
      return;
    }
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.avatarUrl) return;
    setSaving(true);
    try {
      const updated = await apiFetch<Profile>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ name: trimmedName, avatarUrl: trimmedPhoto || null }),
      });
      queryClient.setQueryData(queryKeys.me, updated);
      await invalidateDesk(queryClient);
      toast.success("Profile updated");
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        setErrors({
          name: err.fieldErrors.name,
          avatarUrl: err.fieldErrors.avatarUrl,
          form: err.fieldErrors.name || err.fieldErrors.avatarUrl ? undefined : err.message,
        });
      } else {
        setErrors({ form: err instanceof Error ? err.message : "Couldn't save your profile." });
      }
    } finally {
      setSaving(false);
    }
  }

  const previewName = name.trim() || profile?.name || "You";
  const previewPhoto = photoUrl.trim() || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Edit profile</DialogTitle>
        <DialogDescription>
          Your name and photo show across the desk — queue, cards, and ticket detail.
        </DialogDescription>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <div className="flex items-center gap-3">
            <UserAvatar email={profile?.email} name={previewName} avatarUrl={previewPhoto} className="size-12" />
            <p className="text-[13px] text-mist">Preview — updates as you type.</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-name">Display name</Label>
            <Input
              id="profile-name"
              type="text"
              autoComplete="name"
              maxLength={60}
              placeholder="Ada Obi"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "profile-name-error" : undefined}
            />
            {errors.name && (
              <p id="profile-name-error" role="alert" className="text-[13px] text-destructive">
                {errors.name}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-photo">Photo URL</Label>
            <Input
              id="profile-photo"
              type="url"
              inputMode="url"
              placeholder="https://…"
              value={photoUrl}
              onChange={(event) => setPhotoUrl(event.target.value)}
              aria-invalid={Boolean(errors.avatarUrl)}
              aria-describedby={errors.avatarUrl ? "profile-photo-error" : undefined}
            />
            {errors.avatarUrl && (
              <p id="profile-photo-error" role="alert" className="text-[13px] text-destructive">
                {errors.avatarUrl}
              </p>
            )}
            {photoUrl.trim() && (
              <button
                type="button"
                onClick={() => setPhotoUrl("")}
                className="self-start text-[13px] font-medium text-iris-600 hover:underline"
              >
                Remove photo (use generated avatar)
              </button>
            )}
          </div>
          {errors.form && (
            <p role="alert" className="text-[13px] text-destructive">
              {errors.form}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" aria-hidden />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
