import { Panel, PanelHeader } from "@/components/ui/Panel";

function Placeholder({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-8 pt-10 sm:px-6 sm:pt-14">
      <Panel lit>
        <PanelHeader eyebrow={eyebrow} title={title} description={description} />
      </Panel>
    </div>
  );
}

export function AdminPlaceholder({ name, blurb }: { name: string; blurb: string }) {
  return <Placeholder eyebrow={`Admin · ${name}`} title={`${name} wires up in Phase 5`} description={blurb} />;
}
