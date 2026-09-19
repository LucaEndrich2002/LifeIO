import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "AI" };

export default function AIPage() {
  return (
    <ModulePlaceholder
      name="Life AI"
      headline="Dein Alltag im Zusammenhang."
      description="Hilfreiche Einblicke in Geld, Zeit und Ziele. Nachvollziehbar und unter deiner Kontrolle."
      icon={Sparkles}
      items={["Monatsüberblick", "Zielprognosen", "Wochenrückblick"]}
    />
  );
}
