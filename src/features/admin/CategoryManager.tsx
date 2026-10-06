"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Category } from "@pearl27/contracts";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/shadcn/button";
import { Field, Input } from "@/components/ui/Form";
import { categoriesQueryKey } from "@/features/tickets/categories";
import { ApiError, apiFetch } from "@/lib/api";

/** Category list + create/edit/delete. Employees pick these in the ticket form. */
export function CategoryManager() {
  const queryClient = useQueryClient();
  const categories = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => apiFetch<Category[]>("/admin/categories"),
  });
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fan-out: the manager's own list, the shared category cache backing
  // every form + ticket label, and the desk dashboard aggregate behind the
  // sidebar Categories + board filters. Ticket rows carry only categoryId
  // and resolve names through the shared cache, so no ticket refetch needed.
  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
    await queryClient.invalidateQueries({ queryKey: categoriesQueryKey });
    await queryClient.invalidateQueries({ queryKey: ["desk", "dashboard"] });
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) {
      setError("Category name is required");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await apiFetch("/admin/categories", { method: "POST", body: JSON.stringify({ name }) });
      setNewName("");
      toast.success("Category added");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add the category.");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(id: string) {
    const name = editName.trim();
    if (!name) return;
    setSaving(true);
    try {
      await apiFetch(`/admin/categories/${id}`, { method: "PATCH", body: JSON.stringify({ name }) });
      setEditingId(null);
      toast.success("Category renamed");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't rename the category.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string, name: string) {
    setSaving(true);
    try {
      await apiFetch(`/admin/categories/${id}`, { method: "DELETE" });
      toast.success(`Removed ${name}`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't remove the category.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-label="Ticket categories">
      <p className="eyebrow mb-3">Ticket categories</p>
      <form onSubmit={create} className="flex flex-col gap-3" noValidate>
        <Field htmlFor="new-category" label="New category" error={error ?? undefined}>
          <div className="flex gap-2">
            <Input
              id="new-category"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              invalid={Boolean(error)}
              placeholder="e.g. Conference room booking"
              className="flex-1"
            />
            <Button type="submit" size="sm" disabled={saving}>
              {saving && <Loader2 className="animate-spin" aria-hidden />}
              Add
            </Button>
          </div>
        </Field>
      </form>
      <ul className="mt-3 flex flex-col gap-1.5">
        {categories.isPending && <li className="text-[13px] text-fog">Loading categories…</li>}
        {categories.data?.map((category) => (
          <li key={category.id} className="flex items-center justify-between gap-3 text-[13.5px]">
            {editingId === category.id ? (
              <div className="flex flex-1 items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  aria-label={`Rename ${category.name}`}
                  className="flex-1"
                />
                <Button variant="outline" size="sm" onClick={() => void saveEdit(category.id)} disabled={saving}>
                  Save
                </Button>
                <Button variant="ghost" size="sm" type="button" onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <>
                <span className="text-pearl">{category.name}</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingId(category.id);
                      setEditName(category.name);
                    }}
                    disabled={saving}
                  >
                    Rename
                  </Button>
                  {category.id !== "other" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void remove(category.id, category.name)}
                      disabled={saving || categories.isFetching}
                      className="text-rose-400"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
        {categories.data?.length === 0 && <li className="text-[13px] text-fog">No categories yet.</li>}
      </ul>
    </section>
  );
}