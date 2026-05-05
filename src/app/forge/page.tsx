import Link from "next/link";
import { ForgeClient } from "@/components/ritual/forge-client";

export default function ForgePage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col text-foreground">
      <div className="mx-auto flex min-h-0 w-full max-w-[min(100%,96rem)] flex-1 flex-col px-3 pb-16 pt-4 sm:px-5 md:px-8 lg:px-10">
        <div className="mb-8">
          <Link
            href="/"
            className="font-mono text-xs text-muted transition hover:text-accent md:text-sm"
          >
            ← Exit generator
          </Link>
        </div>
        <ForgeClient />
      </div>
    </div>
  );
}
