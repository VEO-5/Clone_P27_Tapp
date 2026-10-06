import type { Category } from "@pearl27/contracts";

// ---------------------------------------------------------------------------
// Category store — single source of truth for mock mode.
// Lives in its own module so both the admin CRUD (./admin) and the desk
// aggregates (./desk dashboard byCategory) read the same live data.
// (Mirrors production, where the categories table backs both endpoints.)
// ---------------------------------------------------------------------------

const DEFAULT_CATEGORIES: Category[] = [
  { id: "account_access", name: "Sphere account access" },
  { id: "sphere_app", name: "Sphere app issue" },
  { id: "hardware", name: "Hardware / device" },
  { id: "network", name: "Network / VPN" },
  { id: "email", name: "Email / calendar" },
  { id: "other", name: "Something else" },
];

let categories: Category[] = structuredClone(DEFAULT_CATEGORIES);

export function resetCategories() {
  categories = structuredClone(DEFAULT_CATEGORIES);
}

export function listCategories(): Category[] {
  return categories;
}

export function createCategory(input: { name: string; formSchema?: unknown }): Category {
  const category: Category = {
    id: `cat-${Date.now().toString(36)}`,
    name: input.name,
    formSchema: input.formSchema ?? undefined,
  };
  categories.push(category);
  return category;
}

export function updateCategory(id: string, patch: Partial<Pick<Category, "name" | "formSchema">>): Category | null {
  const category = categories.find((c) => c.id === id);
  if (!category) return null;
  if (patch.name !== undefined) category.name = patch.name;
  if (patch.formSchema !== undefined) category.formSchema = patch.formSchema;
  return category;
}

export function deleteCategory(id: string): boolean {
  if (id === "other") return false;
  const index = categories.findIndex((c) => c.id === id);
  if (index === -1) return false;
  categories.splice(index, 1);
  return true;
}
