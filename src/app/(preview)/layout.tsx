import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
export default function PreviewLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
