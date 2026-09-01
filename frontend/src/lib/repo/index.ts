import { isSupabaseConfigured } from "../env";
import { localRepository } from "./local";
import { supabaseRepository } from "./supabase";
import type { TicketRepository } from "./types";

export type { TicketFilter, TicketRepository, UploadFile } from "./types";

let warned = false;

/**
 * Picks the storage backend at call time (not module load) so adding env vars
 * takes effect on the next request without a rebuild.
 */
export function getRepository(): TicketRepository {
  if (isSupabaseConfigured()) return supabaseRepository;

  if (!warned) {
    warned = true;
    console.warn(
      "[repo] Supabase env vars not set — using the local .data store. " +
        "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for the hosted database.",
    );
  }
  return localRepository;
}
