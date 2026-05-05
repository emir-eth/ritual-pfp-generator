import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.45]"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(201,162,39,0.18), transparent 55%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(80,60,120,0.15), transparent 50%), radial-gradient(ellipse 50% 30% at 0% 80%, rgba(40,80,90,0.12), transparent 45%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 ritual-scanline opacity-70" />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-16 pt-8 md:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-4 font-mono text-xs tracking-[0.4em] text-accent uppercase">
            Profile sigil engine
          </p>
          <h1 className="ritual-flicker text-5xl font-semibold tracking-tight text-foreground md:text-6xl lg:text-7xl">
            <span className="ritual-mark-mono inline-block align-baseline font-mono font-semibold tracking-[0.08em]">
              Ritual
            </span>
            <span className="text-foreground"> Identity Generator</span>
          </h1>
          <p className="mx-auto mt-6 max-w-md text-pretty text-base leading-relaxed text-muted md:text-lg">
            Bind archetype, element, and intensity. The forge outputs one ritual profile card —
            framed and ready for X and Discord avatars. No cloud model.
          </p>

          <p className="mx-auto mt-5 max-w-md text-center font-mono text-[10px] leading-relaxed tracking-[0.12em] text-muted/85">
            1024px profile card · in-browser forge
          </p>

          <div className="mt-10 flex flex-col items-center justify-center sm:flex-row">
            <Link
              href="/forge"
              className="group relative inline-flex min-h-[52px] min-w-[220px] items-center justify-center rounded-sm border border-border bg-surface px-8 py-3.5 text-sm font-medium tracking-wide text-foreground transition hover:border-accent/50 hover:bg-[#12121a]"
              style={{ animation: "ritual-pulse-glow 3.5s ease-in-out infinite" }}
            >
              <span className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent opacity-0 transition group-hover:opacity-100" />
              Initiate Ritual
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
