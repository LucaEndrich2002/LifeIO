import { AiGoalScreen } from "@/features/ai/goal-screen";
export const metadata = { title: "Sparziel mit Life AI" };
export default async function AiGoalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <AiGoalScreen id={(await params).id} />;
}
