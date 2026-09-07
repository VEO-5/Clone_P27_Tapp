"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { KnownIssue } from "@pearl27/contracts";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/shadcn/button";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Skeleton } from "@/components/shadcn/skeleton";
import { apiFetch, ApiError } from "@/lib/api";

function IssueForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<"minor" | "major" | "critical">("major");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/admin/known-issues", {
        method: "POST",
        body: JSON.stringify({ title, message, severity }),
      });
      setTitle("");
      setMessage("");
      setErrors({});
      onCreated();
      toast.success("Incident banner is live");
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) setErrors(error.fieldErrors);
      else toast.error(error instanceof Error ? error.message : "Couldn't create the banner.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3 rounded-[4px] border border-ink-700 p-4">
      <p className="text-[14px] font-semibold text-pearl">New incident banner</p>
      <Field htmlFor="ki-title" label="Title" error={errors.title}>
        <Input id="ki-title" value={title} onChange={(e) => setTitle(e.target.value)} invalid={Boolean(errors.title)} placeholder="Sphere login delays" />
      </Field>
      <Field htmlFor="ki-message" label="Message employees see" error={errors.message}>
        <Textarea id="ki-message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} invalid={Boolean(errors.message)} placeholder="What's happening and whether to submit a ticket." />
      </Field>
      <Field htmlFor="ki-severity" label="Severity">
        <Select id="ki-severity" value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)}>
          <option value="minor">Minor</option>
          <option value="major">Major</option>
          <option value="critical">Critical</option>
        </Select>
      </Field>
      <div>
        <Button type="submit" size="sm" disabled={saving}>
          {saving && <Loader2 className="animate-spin" aria-hidden />}
          Publish banner
        </Button>
      </div>
    </form>
  );
}

/** Incident banners: list, create, end now — with employee preview. */
export default function KnownIssuesPage() {
  const queryClient = useQueryClient();
  const issues = useQuery({
    queryKey: ["admin", "known-issues"],
    queryFn: () => apiFetch<KnownIssue[]>("/admin/known-issues"),
  });

  async function endNow(id: string) {
    await apiFetch(`/admin/known-issues/${id}/end`, { method: "POST" });
    await queryClient.invalidateQueries({ queryKey: ["admin", "known-issues"] });
    toast.success("Banner ended");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Panel lit>
        <PanelHeader eyebrow="Admin · Known issues" title="Incident banners" description="What employees see at the top of their dashboard." />
        <div className="flex flex-col gap-6 p-6 sm:p-8">
          <IssueForm onCreated={() => queryClient.invalidateQueries({ queryKey: ["admin", "known-issues"] })} />
          {issues.isPending && <Skeleton className="h-24" />}
          {issues.data?.map((issue) => (
            <div key={issue.id} className="rounded-[4px] border border-gold-400/30 border-l-2 border-l-gold-400 bg-gold-400/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13.5px] font-semibold text-pearl">
                    {issue.title} {!issue.active && <span className="font-normal text-fog">(ended)</span>}
                  </p>
                  <p className="mt-1 text-[13px] text-mist">{issue.message}</p>
                  <p className="mt-1 text-[12px] text-fog">Severity: {issue.severity}</p>
                </div>
                {issue.active && (
                  <Button variant="outline" size="sm" onClick={() => void endNow(issue.id)}>
                    End now
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
