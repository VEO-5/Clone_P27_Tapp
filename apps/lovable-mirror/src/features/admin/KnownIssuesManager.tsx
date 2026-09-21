"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { KnownIssue, KnownIssueSeverity } from "@pearl27/contracts";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { Skeleton } from "@/components/shadcn/skeleton";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { ApiError, apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

const SEVERITIES: KnownIssueSeverity[] = ["minor", "major", "critical"];

const SEVERITY_BADGE: Record<KnownIssueSeverity, "secondary" | "default" | "destructive"> = {
  minor: "secondary",
  major: "default",
  critical: "destructive",
};

/** Incident banners: list active + ended, create new, end now. */
export function KnownIssuesManager() {
  const queryClient = useQueryClient();
  const issues = useQuery({
    queryKey: ["admin", "known-issues"],
    queryFn: () => apiFetch<KnownIssue[]>("/admin/known-issues"),
  });
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<KnownIssueSeverity>("major");
  const [endsAt, setEndsAt] = useState("");
  const [errors, setErrors] = useState<{ title?: string; message?: string }>({});
  const [saving, setSaving] = useState(false);
  const [endingId, setEndingId] = useState<string | null>(null);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["admin", "known-issues"] });
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (title.trim().length < 5) nextErrors.title = "Give the issue a short title (at least 5 characters)";
    if (message.trim().length < 20) nextErrors.message = "Explain it in at least 20 characters";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSaving(true);
    try {
      await apiFetch("/admin/known-issues", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          severity,
          endsAt: endsAt || undefined,
        }),
      });
      setTitle("");
      setMessage("");
      setSeverity("major");
      setEndsAt("");
      toast.success("Incident banner published");
      await refresh();
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        setErrors({ title: err.fieldErrors.title, message: err.fieldErrors.message });
      } else {
        toast.error(err instanceof Error ? err.message : "Couldn't publish the banner.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function endNow(id: string) {
    setEndingId(id);
    try {
      await apiFetch(`/admin/known-issues/${id}/end`, { method: "POST" });
      toast.success("Banner ended");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't end the banner.");
    } finally {
      setEndingId(null);
    }
  }

  if (issues.isPending) {
    return (
      <div aria-busy="true" aria-label="Loading incident banners" className="flex flex-col gap-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (issues.isError) {
    return (
      <p role="alert" className="text-sm text-rose-400">
        Couldn&apos;t load incident banners.{" "}
        <button type="button" onClick={() => issues.refetch()} className="font-medium underline underline-offset-4">
          Retry
        </button>
      </p>
    );
  }

  const active = issues.data.filter((issue) => issue.active);
  const ended = issues.data.filter((issue) => !issue.active);

  return (
    <div className="flex flex-col gap-8">
      <section aria-label="Publish banner">
        <p className="eyebrow mb-3">New banner</p>
        <form onSubmit={create} className="flex flex-col gap-3" noValidate>
          <Field htmlFor="ki-title" label="Title" error={errors.title}>
            <Input
              id="ki-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              invalid={Boolean(errors.title)}
              placeholder="e.g. Sphere login delays"
            />
          </Field>
          <Field htmlFor="ki-message" label="Message" error={errors.message}>
            <Textarea
              id="ki-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              invalid={Boolean(errors.message)}
              rows={3}
              placeholder="What should employees do — submit a ticket or wait?"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field htmlFor="ki-severity" label="Severity">
              <Select id="ki-severity" value={severity} onChange={(e) => setSeverity(e.target.value as KnownIssueSeverity)}>
                {SEVERITIES.map((option) => (
                  <option key={option} value={option}>
                    {option[0]!.toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field htmlFor="ki-ends" label="Ends at" optional>
              <Input id="ki-ends" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </Field>
          </div>
          <div>
            <Button type="submit" size="sm" disabled={saving}>
              {saving && <Loader2 className="animate-spin" aria-hidden />}
              Publish banner
            </Button>
          </div>
        </form>
      </section>

      <section aria-label="Active banners">
        <p className="eyebrow mb-3">Active ({active.length})</p>
        {active.length === 0 ? (
          <p className="text-[13px] text-fog">No active banners.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {active.map((issue) => (
              <li key={issue.id} className="rounded-lg border border-ink-600 bg-white px-4 py-3 shadow-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={SEVERITY_BADGE[issue.severity]}>{issue.severity}</Badge>
                  <span className="text-[13px] font-semibold text-pearl">{issue.title}</span>
                  <span className="ml-auto text-[11.5px] text-fog" title={formatDateTime(issue.startsAt)}>
                    since {formatDateTime(issue.startsAt)}
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-mist">{issue.message}</p>
                <div className="mt-2">
                  <Button variant="outline" size="sm" onClick={() => void endNow(issue.id)} disabled={endingId === issue.id}>
                    {endingId === issue.id && <Loader2 className="animate-spin" aria-hidden />}
                    End now
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {ended.length > 0 && (
        <section aria-label="Ended banners">
          <p className="eyebrow mb-3">Ended ({ended.length})</p>
          <ul className="flex flex-col gap-2">
            {ended.map((issue) => (
              <li key={issue.id} className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
                <span className="text-pearl">{issue.title}</span>
                <span className="text-fog">ended {issue.endsAt ? formatDateTime(issue.endsAt) : "—"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
