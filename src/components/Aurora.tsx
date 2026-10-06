/**
 * Pearl 27 canvas: cream paper, a copper bloom, and a faint navy grid.
 */
export function Aurora() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-ink-950" />
      <div className="animate-aurora absolute -top-[20rem] left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-iris-500/12 blur-[140px]" />
      <div
        className="animate-aurora absolute -right-40 top-1/3 h-[28rem] w-[28rem] rounded-full bg-ink-500/8 blur-[120px]"
        style={{ animationDelay: "-9s" }}
      />
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #1b2a4a 1px, transparent 1px), linear-gradient(to bottom, #1b2a4a 1px, transparent 1px)",
          backgroundSize: "100px 100px",
        }}
      />
    </div>
  );
}
