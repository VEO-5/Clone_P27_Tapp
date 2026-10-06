"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/shadcn/dialog";

const shortcuts = [
  { keys: "j", label: "Move down" },
  { keys: "k", label: "Move up" },
  { keys: "Enter", label: "Open ticket" },
  { keys: "a", label: "Assign to me (unassigned)" },
  { keys: "r", label: "Release ticket" },
  { keys: "?", label: "Toggle this help" },
  { keys: "Esc", label: "Clear focus" },
];

export function KeyboardShortcutsHelp({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Keyboard shortcuts</DialogTitle>
        <DialogDescription>Navigate the queue without touching the mouse.</DialogDescription>
        <ul className="flex flex-col gap-2">
          {shortcuts.map((s) => (
            <li key={s.keys} className="flex items-center justify-between gap-4">
              <span className="text-[13.5px] text-foreground">{s.label}</span>
              <kbd className="inline-flex min-h-7 items-center rounded-md border bg-muted px-2 font-mono text-[12px] text-foreground">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
