import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Money" };

export default function MoneyPage() {
  return (
    <ModulePlaceholder
      name="Money"
      headline="Dein Geld, gut sortiert."
      description="Verstehe deinen finanziellen Spielraum und plane mit einem klaren Blick auf deinen Monat."
      icon={Wallet}
      items={["Einkommen", "Ausgaben", "Budgets"]}
    />
  );
}
