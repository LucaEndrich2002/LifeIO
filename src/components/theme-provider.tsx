"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useState, type ReactNode } from "react";

export function ThemeProvider({
  children,
  nonce,
}: {
  children: ReactNode;
  nonce?: string;
}) {
  // The document policy survives client navigation and server-action refreshes.
  const [documentNonce] = useState(nonce);
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      nonce={documentNonce}
    >
      {children}
    </NextThemesProvider>
  );
}
