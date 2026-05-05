import type { Metadata } from "next";
import { Cinzel, Geist, Geist_Mono } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { RitualPreloader } from "@/components/ritual-preloader";
import { Web3Providers } from "@/components/web3-providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Ritual Identity Generator",
  description:
    "Generate a ritual profile card from archetype, element, and intensity — tuned for social avatars.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} h-full antialiased`}
    >
      <body className="relative flex min-h-dvh flex-col bg-background text-foreground">
        <div
          className="ritual-atmosphere pointer-events-none fixed inset-0 z-0 overflow-hidden"
          aria-hidden
        >
          <div className="ritual-atmosphere__drift" />
          <div className="ritual-atmosphere__vignette" />
          <div className="ritual-atmosphere__grain" />
        </div>
        <Web3Providers>
          <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
            <SiteHeader />
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
            <SiteFooter />
          </div>
        </Web3Providers>
        <RitualPreloader />
      </body>
    </html>
  );
}
