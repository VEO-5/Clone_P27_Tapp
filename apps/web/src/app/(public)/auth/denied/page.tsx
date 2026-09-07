import Link from "next/link";

import { Panel, PanelHeader } from "@/components/ui/Panel";

export const metadata = { title: "Access denied" };

const COPY: Record<string, { title: string; body: string }> = {
  domain: {
    title: "Wrong account domain",
    body: "Sphere Support is for Pearl 27 Google accounts only. Try again with your @pearl27.com address.",
  },
  // Note: deactivated desk/admin accounts are demoted to employee at
  // sign-in — they never land here. This page is for gate denials only.
};

export default async function AuthDeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const copy = COPY[reason ?? ""] ?? {
    title: "Can't sign you in",
    body: "Something went wrong during sign-in. Try again.",
  };
  return (
    <div className="mx-auto max-w-xl px-4 py-20 sm:px-6">
      <Panel lit>
        <PanelHeader eyebrow="Access denied" title={copy.title} description={copy.body} />
        <div className="p-6 sm:p-8">
          <Link
            href="/sign-in"
            className="inline-flex min-h-11 items-center justify-center rounded-[2px] bg-iris-500 px-7 text-sm font-medium text-white"
          >
            Try another account
          </Link>
        </div>
      </Panel>
    </div>
  );
}
