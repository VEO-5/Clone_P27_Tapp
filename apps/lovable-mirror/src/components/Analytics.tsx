import { useEffect } from "react";

import { useSession } from "@/features/auth/useSession";
import { identifyUser } from "@/lib/analytics";

/**
 * Keeps the PostHog identity in sync with the session: identify on sign-in
 * (role/email as person props), reset on sign-out (401). Mount once near the
 * root — renders nothing.
 */
export function AnalyticsSync() {
  const { data, isSuccess, isError } = useSession();
  useEffect(() => {
    if (isSuccess && data) {
      identifyUser({ id: data.id, email: data.email, name: data.name, role: data.role });
    } else if (isError) {
      identifyUser(null);
    }
  }, [data, isSuccess, isError]);
  return null;
}
