import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "LifeOS – Dein persönlicher Überblick",
    template: "%s · LifeOS",
  },
  description: "Geld, Zeit und Ziele. Dein persönlicher Überblick mit LifeOS.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Nonces require per-request rendering, including the public preview.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="de" suppressHydrationWarning>
      <body>
        <ThemeProvider nonce={nonce}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
