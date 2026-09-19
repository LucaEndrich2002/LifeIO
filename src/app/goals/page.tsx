import type { Metadata } from "next";
import { Target } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Goals" };

export default function GoalsPage() {
  return (
    <ModulePlaceholder
      name="Goals"
      headline="Aus Wünschen werden Ziele."
      description="Ob große Reise oder kleiner Meilenstein: Gib deinen Zielen eine Richtung und behalte deinen Fortschritt im Blick."
      icon={Target}
      items={["Sparziele", "Meilensteine", "Fortschritt"]}
    />
  );
}
