export const CATEGORY_NAMES: Record<string, string> = {
  account_access: "Sphere account access",
  sphere_app: "Sphere app issue",
  hardware: "Hardware / device",
  network: "Network / VPN",
  email: "Email / calendar",
  other: "Something else",
};

export function categoryName(id: string): string {
  return CATEGORY_NAMES[id] ?? id;
}
