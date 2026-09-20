import type { ReactNode } from "react";
import { AccountShell } from "@/components/account-shell";
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AccountShell>{children}</AccountShell>;
}
