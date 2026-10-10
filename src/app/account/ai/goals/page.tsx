import { AiGoalsScreen } from "@/features/ai/goals-screen";
export const metadata = { title: "Ziele mit Life AI" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  return <AiGoalsScreen page={(await searchParams).page} />;
}
