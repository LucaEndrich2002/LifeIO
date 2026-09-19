import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Plan" };

export default function PlanPage() {
  return (
    <ModulePlaceholder
      name="Plan"
      headline="Platz für das Wesentliche."
      description="Bringe Aufgaben und Termine zusammen. Damit dein Tag zu dem passt, was dir wichtig ist."
      icon={CalendarDays}
      items={["Aufgaben", "Termine", "Wochenübersicht"]}
    />
  );
}
