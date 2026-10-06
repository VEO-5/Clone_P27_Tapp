import { useSignOut } from "./useSession";

/**
 * MIRROR sign-out button: plain <button> with identical behavior.
 * The shadcn Button + lucide icon land with the component port on arrival.
 */
export function SignOutButton() {
  const signOut = useSignOut();
  return (
    <button
      type="button"
      onClick={() => void signOut()}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-[2px] px-3 text-[13px] font-medium text-mist transition-colors hover:text-pearl"
    >
      Sign out
    </button>
  );
}
