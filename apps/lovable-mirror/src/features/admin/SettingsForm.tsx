"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminSettings } from "@pearl27/contracts";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/shadcn/button";
import { Skeleton } from "@/components/shadcn/skeleton";
import { Field, Input } from "@/components/ui/Form";
import { ApiError, apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

import { CategoryManager } from "./CategoryManager";

/** Admin settings: auto-release, hours, holidays, canned responses + categories. */
export function SettingsForm() {
  const queryClient = useQueryClient();
  const settings = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => apiFetch<AdminSettings>("/admin/settings"),
  });
  const [days, setDays] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings.data) setDays(String(settings.data.autoReleaseWorkingDays));
  }, [settings.data]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = Number(days);
    if (!Number.isInteger(value) || value < 1) {
      setError("Use at least 1 working day");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await apiFetch("/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ autoReleaseWorkingDays: value }),
      });
      toast.success("Settings saved");
      await queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors?.autoReleaseWorkingDays) {
        setError(err.fieldErrors.autoReleaseWorkingDays);
      } else {
        setError(err instanceof Error ? err.message : "Couldn't save settings.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (settings.isPending) {
    return (
      <div aria-busy="true" aria-label="Loading settings" className="flex flex-col gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (settings.isError) {
    return (
      <p role="alert" className="text-sm text-rose-400">
        Couldn&apos;t load settings.{" "}
        <button type="button" onClick={() => settings.refetch()} className="font-medium underline underline-offset-4">
          Retry
        </button>
      </p>
    );
  }

  const data = settings.data;

  return (
    <div className="flex flex-col gap-8">
      <section aria-label="Auto-release">
        <p className="eyebrow mb-3">Auto-release</p>
        <form onSubmit={submit} className="flex max-w-md flex-col gap-3" noValidate>
          <Field htmlFor="auto-release-days" label="Unassigned after" hint="working days" error={error ?? undefined}>
            <div className="flex gap-2">
              <Input
                id="auto-release-days"
                type="number"
                min={1}
                step={1}
                value={days}
                onChange={(e) => setDays(e.target.value)}
                invalid={Boolean(error)}
                className="max-w-32"
              />
              <Button type="submit" size="sm" disabled={saving}>
                {saving && <Loader2 className="animate-spin" aria-hidden />}
                Save
              </Button>
            </div>
          </Field>
        </form>
      </section>

      <section aria-label="Business hours">
        <p className="eyebrow mb-3">Business hours</p>
        <ul className="flex flex-col gap-1.5">
          {data.businessHours.map((row) => (
            <li key={row.day} className="flex items-center justify-between gap-3 text-[13.5px]">
              <span className="text-pearl">{row.day}</span>
              <span className="text-mist">{row.closed ? "Closed" : `${row.open} – ${row.close}`}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Holidays">
        <p className="eyebrow mb-3">Holidays</p>
        {data.holidays.length === 0 ? (
          <p className="text-[13px] text-fog">No holidays set.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {data.holidays.map((holiday) => (
              <li key={holiday.date} className="flex items-center justify-between gap-3 text-[13.5px]">
                <span className="text-pearl">{holiday.label}</span>
                <span className="mono-ref text-[12px] text-fog">{formatDateTime(holiday.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Canned responses">
        <p className="eyebrow mb-3">Canned responses</p>
        {data.cannedResponses.length === 0 ? (
          <p className="text-[13px] text-fog">No canned responses yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {data.cannedResponses.map((canned) => (
              <li key={canned.id} className="rounded-lg border border-ink-600 bg-ink-900/40 px-3 py-2.5">
                <p className="text-[13px] font-semibold text-pearl">
                  {canned.title} <span className="mono-ref ml-1 text-[11px] font-normal text-fog">/{canned.shortcut}</span>
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-mist">{canned.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CategoryManager />
    </div>
  );
}
