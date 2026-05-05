export function SiteFooter() {
  return (
    <footer className="shrink-0 border-t border-white/[0.06] px-6 py-6 text-center font-mono text-xs leading-relaxed text-muted md:px-10 md:text-sm">
      <p>All synthesis runs in your browser.</p>
      <a
        href="https://x.com/emir_ethh"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center justify-center gap-2 text-muted transition hover:text-foreground"
      >
        <span className="inline-flex h-4 w-4 shrink-0 text-foreground md:h-[1.125rem] md:w-[1.125rem]" aria-hidden>
          <svg viewBox="0 0 24 24" className="h-full w-full fill-current" xmlns="http://www.w3.org/2000/svg">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </span>
        <span>
          Created by{" "}
          <span className="text-foreground underline decoration-white/20 underline-offset-2">emir_ethh</span>
        </span>
      </a>
    </footer>
  );
}
