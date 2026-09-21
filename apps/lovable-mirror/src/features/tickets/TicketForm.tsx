"use client";

import { PRIORITY_LABELS } from "@pearl27/contracts";
import { AlertTriangle, Loader2, Send } from "lucide-react";
import { useEffect } from "react";

import { TicketConfirmation } from "@/features/tickets/TicketConfirmation";
import { UploadZone } from "@/features/tickets/UploadZone";
import { Button } from "@/components/shadcn/button";
import { CharCount, Field, Input, Select, Textarea } from "@/components/ui/Form";
import { Panel } from "@/components/ui/Panel";

import {
  DESCRIPTION_MAX,
  TITLE_MAX,
  type TicketFormValues,
  type TicketSubmitController,
} from "./useTicketSubmit";

export function TicketForm({
  controller,
  variant = "panel",
  formId,
  hideFooter = false,
}: {
  /** Submit engine — owned by the page or the slide-over. */
  controller: TicketSubmitController;
  /** `bare` drops the Panel card + header so the form embeds cleanly in a slide-over. */
  variant?: "panel" | "bare";
  /** Passed to the <form> so a sheet footer can submit it via the `form` attribute. */
  formId?: string;
  /** Hide the built-in submit row (a sheet footer owns Cancel/Submit instead). */
  hideFooter?: boolean;
}) {
  const {
    session,
    values,
    set,
    files,
    handleFilesChange,
    errors,
    formError,
    submitting,
    result,
    categories,
    categoriesError,
    reloadCategories,
    formRef,
    handleSubmit,
    retryUpload,
    reset,
  } = controller;

  const bare = variant === "bare";
  const resultTicketId = result?.ticket.id;

  // Page flow: the inline confirmation replaces the form — bring it into view.
  // (Slide-over flow needs no scroll: the confirmation renders in the scroll body.)
  useEffect(() => {
    if (resultTicketId && !bare) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [resultTicketId, bare]);

  if (result) {
    return <TicketConfirmation ticket={result.ticket} uploads={result.uploads} onRetry={retryUpload} onReset={reset} />;
  }

  const fields = (
    <form ref={formRef} id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col">
      {!bare && (
        <div className="border-b border-ink-700/70 px-6 py-6 sm:px-8">
          <p className="eyebrow mb-2">New support request</p>
          <h2 className="text-xl font-semibold tracking-tight text-pearl">
            Tell us what&apos;s happening
          </h2>
          {session.data && (
            <p className="mt-1.5 text-sm text-mist" aria-live="polite">
              Submitting as {session.data.name} · {session.data.email}
            </p>
          )}
        </div>
      )}

      <div className={bare ? "flex flex-col gap-1" : "flex flex-col gap-1 px-6 py-6 sm:px-8"}>
          <Field htmlFor="title" label="Issue title" error={errors.title} hint={`${values.title.length}/${TITLE_MAX}`}>
            <Input
              id="title"
              name="title"
              maxLength={TITLE_MAX}
              placeholder="Can't sign in to my Sphere account"
              value={values.title}
              invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "title-error" : undefined}
              onChange={(event) => set("title", event.target.value)}
            />
          </Field>

          <div className="grid gap-x-5 sm:grid-cols-2">
            <Field htmlFor="categoryId" label="What does this relate to?" error={errors.categoryId}>
              <Select
                id="categoryId"
                name="categoryId"
                value={values.categoryId}
                invalid={Boolean(errors.categoryId)}
                aria-describedby={errors.categoryId ? "categoryId-error" : undefined}
                onChange={(event) => set("categoryId", event.target.value)}
              >
                <option value="">Choose a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
              {categoriesError && (
                <p className="text-[12.5px] text-amber-300" role="alert">
                  {categoriesError}{" "}
                  <button
                    type="button"
                    className="underline underline-offset-2"
                    onClick={reloadCategories}
                  >
                    Retry
                  </button>
                </p>
              )}
            </Field>

            <Field htmlFor="priority" label="How urgent is it?" error={errors.priority}>
              <Select
                id="priority"
                name="priority"
                value={values.priority}
                invalid={Boolean(errors.priority)}
                aria-describedby={errors.priority ? "priority-error" : undefined}
                onChange={(event) => set("priority", event.target.value as TicketFormValues["priority"])}
              >
                {(Object.keys(PRIORITY_LABELS) as (keyof typeof PRIORITY_LABELS)[]).map((priority) => (
                  <option key={priority} value={priority}>
                    {PRIORITY_LABELS[priority]}
                    {priority === "urgent" ? " — I can't work" : ""}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field htmlFor="description" label="Describe the issue" error={errors.description}>
            <Textarea
              id="description"
              name="description"
              rows={6}
              maxLength={DESCRIPTION_MAX}
              placeholder="What were you trying to do? What did you see? Any error message? Which device or browser?"
              value={values.description}
              invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? "description-error" : undefined}
              onChange={(event) => set("description", event.target.value)}
            />
            <div className="flex justify-end">
              <CharCount value={values.description} max={DESCRIPTION_MAX} />
            </div>
          </Field>

          <Field htmlFor="files" label="Screenshots or files" error={errors.files} className="mt-1">
            <UploadZone files={files} onChange={handleFilesChange} disabled={submitting} />
          </Field>
        </div>

        {!hideFooter && (
          <div
            className={
              bare
                ? "flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"
                : "flex flex-col gap-4 border-t border-ink-700/70 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8"
            }
          >
            <div aria-live="assertive" className="min-h-5 flex-1">
              {formError && (
                <p data-form-error tabIndex={-1} className="flex items-start gap-2 text-[13px] text-rose-400 outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60">
                  <AlertTriangle className="mt-px size-4 shrink-0" aria-hidden />
                  {formError}
                </p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              aria-busy={submitting || undefined}
              className="w-full sm:w-auto"
            >
              {submitting ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Send className="size-4" aria-hidden />
              )}
              {submitting ? "Submitting…" : "Submit ticket"}
            </Button>
          </div>
        )}
    </form>
  );

  if (bare) return fields;

  return (
    <Panel lit id="new-ticket" className="scroll-mt-24">
      {fields}
    </Panel>
  );
}
