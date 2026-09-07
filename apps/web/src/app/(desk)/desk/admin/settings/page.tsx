"use client";

import { useQuery } from "@tanstack/react-query";
import type { AdminSettings } from "@pearl27/contracts";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/shadcn/button";
import { Field } from "@/components/ui/Form";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Skeleton } from "@/components/shadcn/skeleton";
import { CategoryManager } from "@/features/admin/CategoryManager";
import { apiFetch, ApiError } from "@/lib/api";

/** Admin settings: auto-release threshold, hours, holidays, canned responses. */
export default function SettingsPage() {
  const settings = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => apiFetch<AdminSettings>("/admin/settings"),
  });
  const [days, setDays] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const value = Number(days ?? settings.data?.autoReleaseWorkingDays ?? 0);
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
      await settings.refetch();
      toast.success("Settings saved");
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors?.autoReleaseWorkingDays) {
        setError(err.fieldErrors.autoReleaseWorkingDays);
      } else {
        toast.error(err instanceof Error ? err.message : "Couldn't save settings.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Panel lit>
        <PanelHeader eyebrow="Admin · Settings" title="Settings" description="Auto-release, business hours, holidays, canned responses." />
        <div className="flex flex-col gap-8 p-6 sm:p-8">
          {settings.isPending && <Skeleton className="h-24" />}
          {settings.isError && (
            <p role="alert" className="text-sm text-rose-400">
              Couldn&apos;t load settings.{" "}
              <button type="button" onClick={() => settings.refetch()} className="font-medium underline underline-offset-4">
                Retry
              </button>
            </p>
          )}
          {settings.data && (
            <form onSubmit={save} className="flex flex-col gap-4" noValidate>
              <Field htmlFor="auto-release" label="Auto-release unworked tickets after" error={error ?? undefined}>
                <div className="flex items-center gap-2">
                  <input
                    id="auto-release"
                    type="number"
                    min={1}
                    step={1}
                    value={days ?? String(settings.data.autoReleaseWorkingDays)}
                    onChange={(event) => setDays(event.target.value)}
                    aria-invalid={Boolean(error)}
                    className="min-h-11 w-28 rounded-[2px] border border-ink-600 bg-white px-3 text-sm text-pearl"
                  />
                  <span className="text-sm text-mist">working days</span>
                </div>
              </Field>
              <div>
                <Button type="submit" size="sm" disabled={saving}>
                  {saving && <Loader2 className="animate-spin" aria-hidden />}
                  Save settings
                </Button>
              </div>
            </form>
          )}

          {settings.data && (
            <section aria-label="Business hours">
              <p className="eyebrow mb-3">Business hours</p>
              <ul className="flex flex-col gap-1.5">
                {settings.data.businessHours.map((row) => (
                  <li key={row.day} className="flex items-center justify-between text-[13.5px]">
                    <span className="text-pearl">{row.day}</span>
                    <span className="text-mist">{row.closed ? "Closed" : `${row.open} – ${row.close}`}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {settings.data && settings.data.holidays.length > 0 && (
            <section aria-label="Holidays">
              <p className="eyebrow mb-3">Holidays</p>
              <ul className="flex flex-col gap-1.5">
                {settings.data.holidays.map((holiday) => (
                  <li key={holiday.date} className="flex items-center justify-between text-[13.5px]">
                    <span className="text-pearl">{holiday.label}</span>
                    <span className="mono-ref text-mist">{holiday.date}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {settings.data && (
            <section aria-label="Canned responses">
              <p className="eyebrow mb-3">Canned responses</p>
              <ul className="flex flex-col gap-2">
                {settings.data.cannedResponses.map((canned) => (
                  <li key={canned.id} className="rounded-[2px] border border-ink-700 p-3">
                    <p className="text-[13.5px] font-medium text-pearl">
                      /{canned.shortcut} · {canned.title}
                    </p>
                    <p className="mt-1 text-[13px] text-mist">{canned.body}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <CategoryManager />
        </div>
      </Panel>
    </div>
  );
}
